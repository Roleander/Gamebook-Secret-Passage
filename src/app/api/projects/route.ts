import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { getEntitlements, limitReached } from "@/lib/entitlements";

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

    const userId = (session.user as any).id;
    const ents = await getEntitlements(userId, (session.user as any).role);

    if (ents.maxProjects !== null) {
      const count = await db.project.count({ where: { userId } });
      if (count >= ents.maxProjects) {
        return limitReached(
          `Has alcanzado el límite de ${ents.maxProjects} proyectos de tu plan. Mejora a Pro para crear más.`
        );
      }
    }

    const project = await db.project.create({
      data: {
        title,
        description,
        userId,
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
