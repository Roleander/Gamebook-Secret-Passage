import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

export type SnapshotInfo = { id: string; label: string; createdAt: Date };

export type RestoreStats = {
  passageCount: number;
  linksRestored: number;
  recreated: number;
  deleted: number;
};

export type RestoreOutcome =
  | { ok: true; stats: RestoreStats }
  | { ok: false; reason: "not_found" | "no_snapshot" };

type SavedPassage = {
  number?: number;
  content: string;
  title?: string | null;
  isStart?: boolean;
  isEndpoint?: boolean;
  sortOrder?: number;
  links?: { targetId: string; linkText?: string | null; condition?: string | null }[];
};

const MAX_SNAPSHOTS = 20;

export async function createProjectSnapshot(
  projectId: string,
  label: string
): Promise<SnapshotInfo> {
  const oldPassages = await db.passage.findMany({
    where: { projectId },
    include: { outgoingLinks: true },
    orderBy: { number: "asc" },
  });

  const snapshotData: Record<string, SavedPassage> = {};
  for (const p of oldPassages) {
    snapshotData[p.id] = {
      number: p.number,
      content: p.content,
      title: p.title,
      isStart: p.isStart,
      isEndpoint: p.isEndpoint,
      sortOrder: p.sortOrder,
      links: p.outgoingLinks.map((l) => ({
        targetId: l.targetId,
        linkText: l.linkText,
        condition: l.condition,
      })),
    };
  }

  const snapshot = await db.shuffleSnapshot.create({
    data: {
      projectId,
      label,
      passageData: snapshotData as Prisma.InputJsonValue,
    },
  });

  const snapshots = await db.shuffleSnapshot.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (snapshots.length > MAX_SNAPSHOTS) {
    await db.shuffleSnapshot.deleteMany({
      where: { id: { in: snapshots.slice(MAX_SNAPSHOTS).map((s) => s.id) } },
    });
  }

  return { id: snapshot.id, label: snapshot.label, createdAt: snapshot.createdAt };
}

export async function restoreProjectSnapshot(
  projectId: string,
  userId: string,
  snapshotId?: string
): Promise<RestoreOutcome> {
  const project = await db.project.findFirst({
    where: { id: projectId, userId },
    include: {
      passages: true,
      snapshots: {
        ...(snapshotId ? { where: { id: snapshotId } } : {}),
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!project) return { ok: false, reason: "not_found" };
  if (project.snapshots.length === 0) return { ok: false, reason: "no_snapshot" };

  const snapshot = project.snapshots[0];
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
      const targetExists = passagesNow.some((p) => p.id === link.targetId);
      if (!targetExists) continue;
      if (passage.id === link.targetId) continue;

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

  // Remove the restored snapshot and any newer ones (their states no longer apply)
  await db.shuffleSnapshot.deleteMany({
    where: { projectId, createdAt: { gte: snapshot.createdAt } },
  });

  return {
    ok: true,
    stats: {
      passageCount: passagesNow.length,
      linksRestored,
      recreated,
      deleted: toDelete.length,
    },
  };
}
