import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    const { sourceId, targetId, linkText, condition } = await req.json();

    if (!sourceId || !targetId) {
      return NextResponse.json(
        { error: "sourceId y targetId son requeridos" },
        { status: 400 }
      );
    }

    // Verify both passages exist and belong to user
    const [source, target] = await Promise.all([
      db.passage.findUnique({
        where: { id: sourceId },
        include: { project: { select: { userId: true } } },
      }),
      db.passage.findUnique({
        where: { id: targetId },
        include: { project: { select: { userId: true } } },
      }),
    ]);

    if (
      !source ||
      !target ||
      source.project.userId !== (session.user as any).id ||
      target.project.userId !== (session.user as any).id
    ) {
      return NextResponse.json(
        { error: "Pasajes no encontrados" },
        { status: 404 }
      );
    }

    // Check if link already exists
    const existingLink = await db.passageLink.findUnique({
      where: {
        sourceId_targetId: { sourceId, targetId },
      },
    });

    if (existingLink) {
      return NextResponse.json(
        { error: "El enlace ya existe" },
        { status: 400 }
      );
    }

    const link = await db.passageLink.create({
      data: {
        sourceId,
        targetId,
        linkText,
        condition,
      },
    });

    return NextResponse.json(link, { status: 201 });
  } catch (error) {
    console.error("Error creating link:", error);
    return NextResponse.json(
      { error: "Error al crear el enlace" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const sourceId = searchParams.get("sourceId");
    const targetId = searchParams.get("targetId");

    if (!sourceId || !targetId) {
      return NextResponse.json(
        { error: "sourceId y targetId son requeridos" },
        { status: 400 }
      );
    }

    // Verify link exists and user has access
    const link = await db.passageLink.findUnique({
      where: {
        sourceId_targetId: { sourceId, targetId },
      },
      include: {
        source: {
          include: { project: { select: { userId: true } } },
        },
      },
    });

    if (!link || link.source.project.userId !== (session.user as any).id) {
      return NextResponse.json(
        { error: "Enlace no encontrado" },
        { status: 404 }
      );
    }

    await db.passageLink.delete({
      where: {
        sourceId_targetId: { sourceId, targetId },
      },
    });

    return NextResponse.json({ message: "Enlace eliminado" });
  } catch (error) {
    console.error("Error deleting link:", error);
    return NextResponse.json(
      { error: "Error al eliminar el enlace" },
      { status: 500 }
    );
  }
}
