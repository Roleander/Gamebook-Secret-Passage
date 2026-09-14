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
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const project = await db.project.findFirst({
      where: {
        id: projectId,
        userId: (session.user as any).id,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
    }

    const { number, title, content, isStart, isEndpoint } = await req.json();

    // Check if passage number already exists
    const existing = await db.passage.findFirst({
      where: {
        projectId,
        number: number,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Ya existe un pasaje con el número ${number}` },
        { status: 400 }
      );
    }

    const passage = await db.passage.create({
      data: {
        projectId,
        number,
        title: title || null,
        content: content || "",
        sortOrder: number,
        isStart: isStart || false,
        isEndpoint: isEndpoint || false,
      },
    });

    return NextResponse.json(passage);
  } catch (error) {
    console.error("Error creating passage:", error);
    return NextResponse.json(
      { error: "Error al crear el pasaje" },
      { status: 500 }
    );
  }
}
