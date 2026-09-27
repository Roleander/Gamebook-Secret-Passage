import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { getEntitlements, upgradeRequired } from "@/lib/entitlements";
import { restoreProjectSnapshot } from "@/lib/snapshots";

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

    const snapshot = await db.shuffleSnapshot.findFirst({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      select: { id: true, label: true, createdAt: true },
    });

    return NextResponse.json({
      hasSnapshot: !!snapshot,
      snapshot: snapshot || null,
    });
  } catch {
    return NextResponse.json({ hasSnapshot: false });
  }
}

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

    const ents = await getEntitlements(session.user.id, session.user.role);
    if (!ents.features.shuffle) {
      return upgradeRequired("shuffle", "Deshacer el barajado requiere un plan Pro");
    }

    const result = await restoreProjectSnapshot(projectId, session.user.id);

    if (!result.ok) {
      if (result.reason === "not_found") {
        return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
      }
      return NextResponse.json({ error: "No hay respaldo para deshacer" }, { status: 400 });
    }

    return NextResponse.json({
      message: "Deshacer completado",
      ...result.stats,
    });
  } catch (error) {
    console.error("Error undoing shuffle:", error);
    return NextResponse.json({ error: "Error al deshacer" }, { status: 500 });
  }
}
