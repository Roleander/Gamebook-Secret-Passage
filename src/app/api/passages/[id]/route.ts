import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

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

    const updates = await req.json();

    // Verify passage exists and belongs to user
    const passage = await db.passage.findUnique({
      where: { id: passageId },
      include: {
        project: {
          select: { userId: true },
        },
      },
    });

    if (!passage || passage.project.userId !== (session.user as any).id) {
      return NextResponse.json(
        { error: "Pasaje no encontrado" },
        { status: 404 }
      );
    }

    const updatedPassage = await db.passage.update({
      where: { id: passageId },
      data: updates,
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

    if (!passage || passage.project.userId !== (session.user as any).id) {
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
