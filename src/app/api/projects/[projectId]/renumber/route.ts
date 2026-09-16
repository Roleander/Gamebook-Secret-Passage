import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { projectId } = await params;
    const body = await req.json().catch(() => ({}));
    const { startFrom = 1, step = 1 } = body;

    // Verify project belongs to user
    const project = await db.project.findFirst({
      where: {
        id: projectId,
        userId: (session.user as any).id,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
    }

    // Get all passages ordered by current number
    const passages = await db.passage.findMany({
      where: { projectId },
      orderBy: { number: "asc" },
    });

    if (passages.length === 0) {
      return NextResponse.json({ message: "No hay pasajes para renumerar" });
    }

    // Renumber sequentially
    const updates = passages.map((passage, index) => {
      const newNumber = startFrom + (index * step);
      return db.passage.update({
        where: { id: passage.id },
        data: { number: newNumber },
      });
    });

    await db.$transaction(updates);

    return NextResponse.json({
      message: `Pasajes renumerados: ${passages.length} pasajes (${startFrom} a ${startFrom + (passages.length - 1) * step})`,
      count: passages.length,
      from: startFrom,
      to: startFrom + (passages.length - 1) * step,
    });
  } catch (error) {
    console.error("Renumber error:", error);
    return NextResponse.json({ error: "Error al renumerar" }, { status: 500 });
  }
}
