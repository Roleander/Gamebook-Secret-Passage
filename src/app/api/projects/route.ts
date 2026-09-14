import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    const projects = await db.project.findMany({
      where: {
        userId: (session.user as any).id,
      },
      include: {
        _count: {
          select: {
            passages: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return NextResponse.json(projects);
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json(
      { error: "Error al obtener los proyectos" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    const { title, description } = await req.json();

    if (!title) {
      return NextResponse.json(
        { error: "El título es requerido" },
        { status: 400 }
      );
    }

    const project = await db.project.create({
      data: {
        title,
        description,
        userId: (session.user as any).id,
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error("Error creating project:", error);
    return NextResponse.json(
      { error: "Error al crear el proyecto" },
      { status: 500 }
    );
  }
}
