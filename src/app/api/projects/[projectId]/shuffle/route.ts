import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { updateAllNumberReferences } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await context.params;
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const project = await db.project.findFirst({
      where: { id: projectId, userId: (session.user as any).id },
      include: { passages: true },
    });

    if (!project) {
      return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
    }

    if (project.passages.length === 0) {
      return NextResponse.json({ error: "No hay pasajes para reordenar" }, { status: 400 });
    }

    const shuffledPassages = [...project.passages].sort(() => Math.random() - 0.5);

    // Step 1: Set all numbers to negative temporary values
    await db.$transaction(
      project.passages.map((passage) =>
        db.passage.update({
          where: { id: passage.id },
          data: { number: -passage.number },
        })
      )
    );

    // Step 2: Set the final numbers
    await db.$transaction(
      shuffledPassages.map((passage, index) =>
        db.passage.update({
          where: { id: passage.id },
          data: { number: index + 1, sortOrder: index, isStart: index === 0 },
        })
      )
    );

    // Build old→new number mapping
    const numberMapping = new Map<number, number>();
    shuffledPassages.forEach((passage, index) => {
      numberMapping.set(passage.number, index + 1);
    });

    // Update number references in all passage content
    const allPassages = await db.passage.findMany({
      where: { projectId },
    });

    const contentUpdates: Promise<any>[] = [];
    for (const p of allPassages) {
      const newContent = updateAllNumberReferences(p.content, numberMapping);
      if (newContent !== p.content) {
        contentUpdates.push(
          db.passage.update({ where: { id: p.id }, data: { content: newContent } })
        );
      }
    }
    if (contentUpdates.length > 0) {
      for (const update of contentUpdates) {
        await update;
      }
    }

    return NextResponse.json({
      message: "Pasajes reordenados aleatoriamente",
      passageCount: shuffledPassages.length,
      mapping: Object.fromEntries(numberMapping),
      contentUpdates: contentUpdates.length,
    });
  } catch (error) {
    console.error("Error shuffling passages:", error);
    return NextResponse.json({ error: "Error al reordenar los pasajes" }, { status: 500 });
  }
}
