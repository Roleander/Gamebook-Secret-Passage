import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { getEntitlements, upgradeRequired } from "@/lib/entitlements";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await context.params;
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const ents = await getEntitlements(session.user.id, session.user.role);
    if (!ents.features.analyze) {
      return upgradeRequired("analyze", "Los agentes de análisis requieren un plan Pro");
    }

    const project = await db.project.findFirst({
      where: { id: projectId, userId: session.user.id },
      select: { id: true },
    });
    if (!project) {
      return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
    }

    const importHistory = await db.importHistory.findFirst({
      where: { projectId },
      orderBy: { importedAt: "desc" },
      select: { rawContent: true, filename: true, importedAt: true },
    });

    return NextResponse.json({
      rawContent: importHistory?.rawContent ?? null,
      filename: importHistory?.filename ?? null,
      importedAt: importHistory?.importedAt ?? null,
    });
  } catch (error) {
    console.error("Error fetching raw content:", error);
    return NextResponse.json(
      { error: "Error al obtener el contenido" },
      { status: 500 }
    );
  }
}
