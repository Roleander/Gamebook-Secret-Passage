import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { getEntitlements, limitReached } from "@/lib/entitlements";
import { z } from "zod";
import { parseOr400 } from "@/lib/api-validate";

const createProjectSchema = z.object({
  title: z
    .string({ error: "El título es requerido" })
    .min(1, { error: "El título es requerido" })
    .max(300),
  description: z.string().max(5000).nullable().optional(),
});

type SessionUser = { id?: string; role?: string };

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as SessionUser | undefined)?.id;

    if (!userId) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401, headers: { "Cache-Control": "private, no-store" } }
      );
    }

    const projects = await db.project.findMany({
      where: {
        userId,
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

    return NextResponse.json(projects, {
      headers: { "Cache-Control": "private, no-store" },
    });
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
    const user = session?.user as SessionUser | undefined;

    if (!user?.id) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    const userId = user.id;
    const parsed = parseOr400(
      createProjectSchema,
      await req.json().catch(() => null)
    );
    if (!parsed.ok) return parsed.response;
    const { title, description } = parsed.data;

    const ents = await getEntitlements(userId, user.role);

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
