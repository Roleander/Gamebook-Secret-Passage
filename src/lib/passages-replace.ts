import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

export interface ReplaceSegment {
  title?: string | null;
  content: string;
  isStart?: boolean;
  isEndpoint?: boolean;
}

export interface ReplaceLink {
  fromIndex: number;
  toIndex: number;
  text?: string;
}

export interface ReplaceResult {
  passageCount: number;
  linksCreated: number;
  snapshotId: string;
}

export async function replaceProjectPassages(
  projectId: string,
  segments: ReplaceSegment[],
  links: ReplaceLink[],
  label: string
): Promise<ReplaceResult> {
  const oldPassages = await db.passage.findMany({
    where: { projectId },
    include: { outgoingLinks: true },
    orderBy: { number: "asc" },
  });

  const snapshotData: Record<
    string,
    {
      number: number;
      content: string;
      title: string | null;
      isStart: boolean;
      isEndpoint: boolean;
      sortOrder: number;
      links: { targetId: string; linkText: string | null; condition: string | null }[];
    }
  > = {};
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
  });
  if (snapshots.length > 5) {
    await db.shuffleSnapshot.deleteMany({
      where: { id: { in: snapshots.slice(5).map((s) => s.id) } },
    });
  }

  await db.passage.deleteMany({ where: { projectId } });

  await db.passage.createMany({
    data: segments.map((segment, index) => ({
      projectId,
      number: index + 1,
      title: segment.title ?? null,
      content: segment.content,
      sortOrder: index,
      isStart: segment.isStart ?? index === 0,
      isEndpoint: segment.isEndpoint ?? false,
    })),
  });

  const created = await db.passage.findMany({
    where: { projectId },
    orderBy: { number: "asc" },
  });

  let linksCreated = 0;
  const seenPairs = new Set<string>();
  for (const link of links) {
    const source = created[link.fromIndex];
    const target = created[link.toIndex];
    if (!source || !target || source.id === target.id) continue;

    const key = `${link.fromIndex}-${link.toIndex}`;
    if (seenPairs.has(key)) continue;
    seenPairs.add(key);

    await db.passageLink.create({
      data: {
        sourceId: source.id,
        targetId: target.id,
        linkText: link.text ?? null,
      },
    });
    linksCreated++;
  }

  return {
    passageCount: segments.length,
    linksCreated,
    snapshotId: snapshot.id,
  };
}
