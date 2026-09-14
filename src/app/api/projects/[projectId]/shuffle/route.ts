import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";

export async function POST(
  req: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await context.params;
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    const project = await db.project.findFirst({
      where: {
        id: projectId,
        userId: (session.user as any).id,
      },
      include: {
        passages: true,
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Proyecto no encontrado" },
        { status: 404 }
      );
    }

    // Shuffle passages
    const shuffledPassages = [...project.passages].sort(
      () => Math.random() - 0.5
    );

    // Create a mapping from old numbers to new numbers
    const numberMapping = new Map<number, number>();
    shuffledPassages.forEach((passage, index) => {
      numberMapping.set(passage.number, index + 1);
    });

    // Update all passages with new numbers
    await db.$transaction(
      shuffledPassages.map((passage, index) =>
        db.passage.update({
          where: { id: passage.id },
          data: {
            number: index + 1,
            sortOrder: index,
          },
        })
      )
    );

    return NextResponse.json({
      message: "Pasajes reordenados aleatoriamente",
      passageCount: shuffledPassages.length,
      mapping: Object.fromEntries(numberMapping),
    });
  } catch (error) {
    console.error("Error shuffling passages:", error);
    return NextResponse.json(
      { error: "Error al reordenar los pasajes" },
      { status: 500 }
    );
  }
}
