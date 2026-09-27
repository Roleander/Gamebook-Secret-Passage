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

    const project = await db.project.findFirst({
      where: { id: projectId, userId: session.user.id },
      include: {
        passages: true,
        snapshots: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
    }

    if (project.snapshots.length === 0) {
      return NextResponse.json({ error: "No hay respaldo para deshacer" }, { status: 400 });
    }

    const snapshot = project.snapshots[0];
    type SavedPassage = {
      number?: number;
      content: string;
      title?: string | null;
      isStart?: boolean;
      isEndpoint?: boolean;
      sortOrder?: number;
      links?: { targetId: string; linkText?: string | null; condition?: string | null }[];
    };
    const snapshotData = snapshot.passageData as unknown as Record<string, SavedPassage | null>;

    const currentIds = new Set(project.passages.map((p) => p.id));
    const snapshotIds = new Set(Object.keys(snapshotData));

    // Delete passages created after the snapshot
    const toDelete = project.passages.filter((p) => !snapshotIds.has(p.id));
    if (toDelete.length > 0) {
      await db.passage.deleteMany({
        where: { id: { in: toDelete.map((p) => p.id) } },
      });
    }

    // Recreate passages that existed in the snapshot but were deleted since
    let recreated = 0;
    const missingEntries = Object.entries(snapshotData).filter(
      ([id, data]) =>
        !currentIds.has(id) &&
        data !== null &&
        typeof data === "object" &&
        typeof data.number === "number"
    );
    for (const [id, data] of missingEntries) {
      if (data === null || typeof data.number !== "number") continue;
      const saved = data;
      await db.passage.create({
        data: {
          id,
          projectId,
          number: data.number,
          title: saved.title ?? null,
          content: saved.content,
          isStart: saved.isStart ?? false,
          isEndpoint: saved.isEndpoint ?? false,
          sortOrder: saved.sortOrder ?? 0,
        },
      });
      recreated++;
    }

    // Restore passage content and metadata for passages still present
    for (const passage of project.passages) {
      const saved = snapshotData[passage.id];
      if (!saved) continue;

      await db.passage.update({
        where: { id: passage.id },
        data: {
          content: saved.content,
          title: saved.title,
          isEndpoint: saved.isEndpoint,
          isStart: saved.isStart,
        },
      });
    }

    // Restore PassageLink records
    const passagesNow = await db.passage.findMany({ where: { projectId } });
    const passageIds = passagesNow.map((p) => p.id);
    await db.passageLink.deleteMany({
      where: { sourceId: { in: passageIds } },
    });

    let linksRestored = 0;
    for (const passage of passagesNow) {
      const saved = snapshotData[passage.id];
      if (!saved?.links) continue;

      for (const link of saved.links) {
        // Verify target still exists
        const targetExists = passagesNow.some((p) => p.id === link.targetId);
        if (!targetExists) continue;
        if (passage.id === link.targetId) continue; // skip self-links

        const existing = await db.passageLink.findUnique({
          where: {
            sourceId_targetId: {
              sourceId: passage.id,
              targetId: link.targetId,
            },
          },
        });

        if (!existing) {
          await db.passageLink.create({
            data: {
              sourceId: passage.id,
              targetId: link.targetId,
              linkText: link.linkText,
              condition: link.condition,
            },
          });
          linksRestored++;
        }
      }
    }

    // Delete the snapshot we just restored
    await db.shuffleSnapshot.delete({ where: { id: snapshot.id } });

    return NextResponse.json({
      message: "Deshacer completado",
      passageCount: passagesNow.length,
      linksRestored,
      recreated,
      deleted: toDelete.length,
    });
  } catch (error) {
    console.error("Error undoing shuffle:", error);
    return NextResponse.json({ error: "Error al deshacer" }, { status: 500 });
  }
}
