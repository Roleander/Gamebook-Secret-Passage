import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { replaceNumberReferences } from "@/lib/number-references";
import { rewriteProjectLinkTexts } from "@/lib/link-texts";
import { syncProjectLinks } from "@/lib/link-sync";
import { getEntitlements } from "@/lib/entitlements";
import { createProjectSnapshot } from "@/lib/snapshots";
import {
  referencesTo,
  removeSentencesContainingReference,
} from "@/lib/reference-mentions";

export const dynamic = "force-dynamic";

const passagePatchSchema = z.object({
  title: z.string().max(300).nullable().optional(),
  content: z.string().optional(),
  number: z.number().int().min(1).optional(),
  isStart: z.boolean().optional(),
  isEndpoint: z.boolean().optional(),
});

const passageDeleteSchema = z.object({
  onReferences: z
    .object({
      action: z.enum(["redirect", "remove_sentences", "leave"]),
      targetNumber: z.number().int().min(1).optional(),
    })
    .optional(),
  closeGap: z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: passageId } = await context.params;
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => null);
    if (body === null || typeof body !== "object") {
      return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
    }

    const parsed = passagePatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Datos inválidos",
          details: parsed.error.issues.map(
            (issue) => `${issue.path.join(".")}: ${issue.message}`
          ),
        },
        { status: 400 }
      );
    }
    const updates = parsed.data;

    // Verify passage exists and belongs to user
    const passage = await db.passage.findUnique({
      where: { id: passageId },
      include: {
        project: {
          select: { userId: true },
        },
      },
    });

    if (!passage || passage.project.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Pasaje no encontrado" },
        { status: 404 }
      );
    }

    const { number: newNumber, ...rest } = updates;
    const numberChanged = newNumber !== undefined && newNumber !== passage.number;
    const hasOtherUpdates = Object.keys(rest).length > 0;

    if (numberChanged || hasOtherUpdates) {
      try {
        if (numberChanged && hasOtherUpdates) {
          await db.passage.update({
            where: { id: passageId },
            data: { ...rest, number: newNumber },
          });
        } else if (numberChanged) {
          await db.passage.update({
            where: { id: passageId },
            data: { number: newNumber },
          });
        } else {
          await db.passage.update({
            where: { id: passageId },
            data: rest,
          });
        }
      } catch (updateError) {
        if (
          updateError instanceof Prisma.PrismaClientKnownRequestError &&
          updateError.code === "P2002"
        ) {
          return NextResponse.json(
            { error: "Ya existe un pasaje con ese número en este proyecto" },
            { status: 409 }
          );
        }
        throw updateError;
      }
    }

    if (numberChanged) {
      const numberMapping = new Map<number, number>([
        [passage.number, newNumber],
      ]);
      const allPassages = await db.passage.findMany({
        where: { projectId: passage.projectId },
      });
      const contentUpdates: ReturnType<typeof db.passage.update>[] = [];
      for (const p of allPassages) {
        const newContent = replaceNumberReferences(p.content, numberMapping);
        if (newContent !== p.content) {
          contentUpdates.push(
            db.passage.update({ where: { id: p.id }, data: { content: newContent } })
          );
        }
      }
      for (const update of contentUpdates) {
        await update;
      }
      await rewriteProjectLinkTexts(passage.projectId, numberMapping);
    }

    const contentChanged = updates.content !== undefined;
    if (contentChanged || numberChanged) {
      try {
        await syncProjectLinks(passage.projectId);
      } catch (syncError) {
        console.error("Error syncing links after passage update:", syncError);
      }
    }

    const updatedPassage = await db.passage.findUnique({
      where: { id: passageId },
    });

    return NextResponse.json(updatedPassage);
  } catch (error) {
    console.error("Error updating passage:", error);
    return NextResponse.json(
      { error: "Error al actualizar el pasaje" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: passageId } = await context.params;
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    // Verify passage exists and belongs to user
    const passage = await db.passage.findUnique({
      where: { id: passageId },
      include: {
        project: {
          select: { userId: true },
        },
      },
    });

    if (!passage || passage.project.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Pasaje no encontrado" },
        { status: 404 }
      );
    }

    const rawBody = await req.json().catch(() => null);
    const parsedDelete = passageDeleteSchema.safeParse(rawBody ?? {});
    if (!parsedDelete.success) {
      return NextResponse.json(
        { error: "Datos inválidos" },
        { status: 400 }
      );
    }
    const action = parsedDelete.data.onReferences?.action ?? "leave";
    const targetNumber = parsedDelete.data.onReferences?.targetNumber;
    const closeGap = parsedDelete.data.closeGap === true && action !== "leave";

    const others = await db.passage.findMany({
      where: { projectId: passage.projectId, id: { not: passageId } },
      select: { id: true, number: true, content: true },
    });
    const affected = others.filter((p) =>
      referencesTo(p.content, passage.number)
    );
    const affectedCount = affected.length;

    if (action === "redirect") {
      if (
        targetNumber === undefined ||
        targetNumber === passage.number ||
        !others.some((p) => p.number === targetNumber)
      ) {
        return NextResponse.json(
          { error: "Destino de redirección inválido" },
          { status: 400 }
        );
      }
    }

    // Respaldo previo (historial Pro) para poder deshacer el borrado
    let snapshotCreated = false;
    try {
      const ents = await getEntitlements(session.user.id, session.user.role);
      if (ents.features.shuffle) {
        await createProjectSnapshot(
          passage.projectId,
          `Antes de borrar pasaje ${passage.number}`
        );
        snapshotCreated = true;
      }
    } catch (snapshotError) {
      console.error("Error creating snapshot before delete:", snapshotError);
    }

    const contents = new Map(others.map((p) => [p.id, p.content]));
    const updateContent = async (id: string, content: string) => {
      contents.set(id, content);
      await db.passage.update({ where: { id }, data: { content } });
    };

    if (action === "redirect" && affectedCount > 0 && targetNumber !== undefined) {
      const redirectMapping = new Map<number, number>([
        [passage.number, targetNumber],
      ]);
      for (const p of affected) {
        const newContent = replaceNumberReferences(p.content, redirectMapping);
        if (newContent !== p.content) {
          await updateContent(p.id, newContent);
        }
      }
      await rewriteProjectLinkTexts(passage.projectId, redirectMapping);
    } else if (action === "remove_sentences") {
      for (const p of affected) {
        const newContent = removeSentencesContainingReference(
          p.content,
          passage.number
        );
        if (newContent !== p.content) {
          await updateContent(p.id, newContent);
        }
      }
    }

    // Renumerar pasajes posteriores para cerrar el hueco del borrado
    let gapClosed = false;
    if (closeGap) {
      const shiftMapping = new Map<number, number>();
      for (const p of others) {
        if (p.number > passage.number) {
          shiftMapping.set(p.number, p.number - 1);
        }
      }
      if (shiftMapping.size > 0) {
        for (const p of others) {
          const current = contents.get(p.id) ?? p.content;
          const newContent = replaceNumberReferences(current, shiftMapping);
          if (newContent !== current) {
            await updateContent(p.id, newContent);
          }
        }
        await rewriteProjectLinkTexts(passage.projectId, shiftMapping);
        gapClosed = true;
      }
    }

    // Delete related links first
    await db.passageLink.deleteMany({
      where: {
        OR: [{ sourceId: passageId }, { targetId: passageId }],
      },
    });

    // Delete passage
    await db.passage.delete({
      where: { id: passageId },
    });

    try {
      await syncProjectLinks(passage.projectId);
    } catch (syncError) {
      console.error("Error syncing links after passage delete:", syncError);
    }

    return NextResponse.json({
      message: "Pasaje eliminado",
      action,
      affectedCount,
      gapClosed,
      snapshot: snapshotCreated,
    });
  } catch (error) {
    console.error("Error deleting passage:", error);
    return NextResponse.json(
      { error: "Error al eliminar el pasaje" },
      { status: 500 }
    );
  }
}
