import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { replaceNumberReferences } from "@/lib/number-references";

export const dynamic = "force-dynamic";

const passagePatchSchema = z.object({
  title: z.string().max(300).nullable().optional(),
  content: z.string().optional(),
  number: z.number().int().min(1).optional(),
  isStart: z.boolean().optional(),
  isEndpoint: z.boolean().optional(),
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

    return NextResponse.json({ message: "Pasaje eliminado" });
  } catch (error) {
    console.error("Error deleting passage:", error);
    return NextResponse.json(
      { error: "Error al eliminar el pasaje" },
      { status: 500 }
    );
  }
}
