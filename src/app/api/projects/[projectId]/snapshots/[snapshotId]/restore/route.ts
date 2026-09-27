import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getEntitlements, upgradeRequired } from "@/lib/entitlements";
import { restoreProjectSnapshot } from "@/lib/snapshots";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  context: { params: Promise<{ projectId: string; snapshotId: string }> }
) {
  try {
    const { projectId, snapshotId } = await context.params;
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const ents = await getEntitlements(session.user.id, session.user.role);
    if (!ents.features.shuffle) {
      return upgradeRequired("shuffle", "Restaurar versiones requiere un plan Pro");
    }

    const result = await restoreProjectSnapshot(projectId, session.user.id, snapshotId);

    if (!result.ok) {
      if (result.reason === "not_found") {
        return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
      }
      return NextResponse.json({ error: "No hay respaldo para deshacer" }, { status: 400 });
    }

    return NextResponse.json({ message: "Versión restaurada", ...result.stats });
  } catch (error) {
    console.error("Error restoring snapshot:", error);
    return NextResponse.json({ error: "Error al restaurar" }, { status: 500 });
  }
}
