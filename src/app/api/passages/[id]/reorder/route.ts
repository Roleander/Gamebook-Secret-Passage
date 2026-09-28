import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { replaceNumberReferences } from "@/lib/number-references";
import { rewriteProjectLinkTexts } from "@/lib/link-texts";
import { z } from "zod";

export const dynamic = "force-dynamic";

const reorderBodySchema = z.union([
  z.object({ direction: z.enum(["up", "down"]) }),
  z.object({ toNumber: z.number().int() }),
]);

type PassageWithOwner = {
  id: string;
  number: number;
  projectId: string;
  project: { userId: string };
};

async function moveToSlot(passage: PassageWithOwner, toNumber: number) {
  const sorted = await db.passage.findMany({
    where: { projectId: passage.projectId },
    orderBy: { number: "asc" },
  });

  const fromIdx = sorted.findIndex((p) => p.id === passage.id);
  const targetIdx = sorted.findIndex((p) => p.number === toNumber);

  if (targetIdx === -1) {
    return NextResponse.json(
      { error: "No hay pasaje con ese número en este proyecto" },
      { status: 400 }
    );
  }
  if (targetIdx === fromIdx) {
    return NextResponse.json({
      message: "Sin cambios",
      oldNumber: passage.number,
      newNumber: passage.number,
      contentUpdates: 0,
    });
  }

  const lo = Math.min(fromIdx, targetIdx);
  const hi = Math.max(fromIdx, targetIdx);
  const segment = sorted.slice(lo, hi + 1);
  const segmentNumbers = segment.map((p) => p.number);
  const idsInNewOrder = segment
    .map((p) => p.id)
    .filter((id) => id !== passage.id);
  idsInNewOrder.splice(targetIdx - lo, 0, passage.id);

  const newNumberById = new Map<string, number>();
  idsInNewOrder.forEach((id, k) => newNumberById.set(id, segmentNumbers[k]));

  const numberMapping = new Map<number, number>();
  for (const p of segment) {
    const newNumber = newNumberById.get(p.id);
    if (newNumber !== undefined && newNumber !== p.number) {
      numberMapping.set(p.number, newNumber);
    }
  }

  const changing = segment.filter((p) => numberMapping.has(p.number));
  const sentinel = new Map<string, number>();
  changing.forEach((p, k) => sentinel.set(p.id, -(k + 1)));

  await db.$transaction([
    ...changing.map((p) =>
      db.passage.update({
        where: { id: p.id },
        data: { number: sentinel.get(p.id)! },
      })
    ),
    ...changing.map((p) =>
      db.passage.update({
        where: { id: p.id },
        data: { number: numberMapping.get(p.number)! },
      })
    ),
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

  const linkTextUpdates = await rewriteProjectLinkTexts(
    passage.projectId,
    numberMapping
  );

  return NextResponse.json({
    message: `Pasaje movido a la posición de ${toNumber}`,
    oldNumber: passage.number,
    newNumber: newNumberById.get(passage.id),
    contentUpdates: contentUpdates.length,
    linkTextUpdates,
  });
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: passageId } = await context.params;
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const parsed = reorderBodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Envía direction ('up' o 'down') o toNumber (número entero)" },
        { status: 400 }
      );
    }

    const passage = await db.passage.findUnique({
      where: { id: passageId },
      include: {
        project: { select: { userId: true } },
      },
    });

    if (!passage || passage.project.userId !== session.user.id) {
      return NextResponse.json({ error: "Pasaje no encontrado" }, { status: 404 });
    }

    if ("toNumber" in parsed.data) {
      return await moveToSlot(passage, parsed.data.toNumber);
    }

    const { direction } = parsed.data;
    const targetNumber = direction === "up" ? passage.number - 1 : passage.number + 1;

    if (targetNumber < 1) {
      return NextResponse.json(
        { error: "El pasaje ya está en la primera posición" },
        { status: 400 }
      );
    }

    const adjacentPassage = await db.passage.findFirst({
      where: {
        projectId: passage.projectId,
        number: targetNumber,
      },
    });

    if (!adjacentPassage) {
      return NextResponse.json(
        { error: "No hay pasaje en esa dirección" },
        { status: 400 }
      );
    }

    // Swap numbers
    await db.$transaction([
      db.passage.update({ where: { id: passage.id }, data: { number: -passage.number } }),
      db.passage.update({ where: { id: adjacentPassage.id }, data: { number: passage.number } }),
      db.passage.update({ where: { id: passage.id }, data: { number: targetNumber } }),
    ]);

    // Update number references in all passage content
    const allPassages = await db.passage.findMany({
      where: { projectId: passage.projectId },
    });

    const numberMapping = new Map<number, number>([
      [passage.number, targetNumber],
      [adjacentPassage.number, passage.number],
    ]);

    const updates: ReturnType<typeof db.passage.update>[] = [];
    for (const p of allPassages) {
      const newContent = replaceNumberReferences(p.content, numberMapping);
      if (newContent !== p.content) {
        updates.push(
          db.passage.update({ where: { id: p.id }, data: { content: newContent } })
        );
      }
    }
    if (updates.length > 0) {
      for (const update of updates) {
        await update;
      }
    }

    const linkTextUpdates = await rewriteProjectLinkTexts(
      passage.projectId,
      numberMapping
    );

    return NextResponse.json({
      message: `Pasaje movido ${direction === "up" ? "arriba" : "abajo"}`,
      oldNumber: passage.number,
      newNumber: targetNumber,
      contentUpdates: updates.length,
      linkTextUpdates,
    });
  } catch (error) {
    console.error("Error reordering passage:", error);
    return NextResponse.json({ error: "Error al reordenar el pasaje" }, { status: 500 });
  }
}
