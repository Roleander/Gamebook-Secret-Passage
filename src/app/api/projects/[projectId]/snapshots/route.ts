import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { createProjectSnapshot } from "@/lib/snapshots";
import { getEntitlements, upgradeRequired } from "@/lib/entitlements";

export const dynamic = "force-dynamic";

async function requireOwnedProject(projectId: string, userId: string) {
  return db.project.findFirst({
    where: { id: projectId, userId },
    select: { id: true },
  });
}

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

    const project = await requireOwnedProject(projectId, session.user.id);
    if (!project) {
      return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
    }

    const snapshots = await db.shuffleSnapshot.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      select: { id: true, label: true, createdAt: true },
    });

    return NextResponse.json({ snapshots });
  } catch (error) {
    console.error("Error listing snapshots:", error);
    return NextResponse.json({ error: "Error al listar versiones" }, { status: 500 });
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
const project = await requireOwnedProject(projectId, session.user.id);
    if (!project) {
      return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const label =
      typeof body.label === "string" && body.label.trim().length > 0
        ? body.label.trim().slice(0, 80)
        : "Versión manual";

    const ents = await getEntitlements(session.user.id, session.user.role);
    if (!ents.features.shuffle) {
      return upgradeRequired("shuffle", "El historial de versiones requiere un plan Pro");
    }

    const snapshot = await createProjectSnapshot(projectId, label);
    return NextResponse.json({ snapshot }, { status: 201 });
  } catch (error) {
    console.error("Error creating snapshot:", error);
    return NextResponse.json({ error: "Error al guardar versión" }, { status: 500 });
  }
}
