import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

function updateNumberInText(content: string, oldNumber: number, newNumber: number): string {
  const oldStr = String(oldNumber);
  const newStr = String(newNumber);
  const regex = new RegExp(`\\b${oldStr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g");
  return content.replace(regex, newStr);
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

    const { direction } = await req.json();

    if (!direction || !["up", "down"].includes(direction)) {
      return NextResponse.json(
        { error: "direction debe ser 'up' o 'down'" },
        { status: 400 }
      );
    }

    const passage = await db.passage.findUnique({
      where: { id: passageId },
      include: {
        project: { select: { userId: true } },
      },
    });

    if (!passage || passage.project.userId !== (session.user as any).id) {
      return NextResponse.json({ error: "Pasaje no encontrado" }, { status: 404 });
    }

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

    const updates: Promise<any>[] = [];
    for (const p of allPassages) {
      let newContent = p.content;
      newContent = updateNumberInText(newContent, passage.number, targetNumber);
      newContent = updateNumberInText(newContent, adjacentPassage.number, passage.number);
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

    return NextResponse.json({
      message: `Pasaje movido ${direction === "up" ? "arriba" : "abajo"}`,
      oldNumber: passage.number,
      newNumber: targetNumber,
      contentUpdates: updates.length,
    });
  } catch (error) {
    console.error("Error reordering passage:", error);
    return NextResponse.json({ error: "Error al reordenar el pasaje" }, { status: 500 });
  }
}
