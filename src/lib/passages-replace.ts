import { db } from "@/lib/db";
import { createProjectSnapshot } from "@/lib/snapshots";

export interface ReplaceSegment {
  title?: string | null;
  content: string;
  isStart?: boolean;
  isEndpoint?: boolean;
  number?: number | null;
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
  const snapshot = await createProjectSnapshot(projectId, label);

  await db.passage.deleteMany({ where: { projectId } });

  const usedNumbers = new Set<number>();
  const data = segments.map((segment, index) => {
    let number = segment.number ?? index + 1;
    if (usedNumbers.has(number)) {
      number = Math.max(0, ...usedNumbers) + 1;
      while (usedNumbers.has(number)) number++;
    }
    usedNumbers.add(number);
    return {
      projectId,
      number,
      title: segment.title ?? null,
      content: segment.content,
      sortOrder: index,
      isStart: segment.isStart ?? (number === 1 || index === 0),
      isEndpoint: segment.isEndpoint ?? false,
    };
  });

  await db.passage.createMany({
    data,
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
