import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveExtAuth } from "@/lib/ext-auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const auth = await resolveExtAuth(req);
    if (!auth) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const projects = await db.project.findMany({
      where: { userId: auth.userId },
      orderBy: { updatedAt: "desc" },
      take: 30,
      select: {
        id: true,
        title: true,
        updatedAt: true,
        _count: { select: { passages: true } },
      },
    });

    return NextResponse.json({
      projects: projects.map((p) => ({
        id: p.id,
        title: p.title,
        passageCount: p._count.passages,
        updatedAt: p.updatedAt,
      })),
    });
  } catch (error) {
    console.error("Ext projects error:", error);
    return NextResponse.json({ error: "Error al listar proyectos" }, { status: 500 });
  }
}
