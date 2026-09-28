export interface SnapshotLinkInput {
  targetId?: string;
  target: { number: number };
  linkText?: string | null;
  condition?: string | null;
}

export interface SnapshotPassageInput {
  number: number;
  title?: string | null;
  content: string;
  isStart?: boolean;
  isEndpoint?: boolean;
  outgoingLinks?: SnapshotLinkInput[];
}

export interface SnapshotProjectInput {
  id: string;
  title: string;
  description?: string | null;
  passages: SnapshotPassageInput[];
}

export interface OfflineLink {
  targetNumber: number;
  linkText: string | null;
  condition: string | null;
}

export interface OfflinePassage {
  number: number;
  title: string | null;
  content: string;
  isStart: boolean;
  isEndpoint: boolean;
  links: OfflineLink[];
}

export interface OfflineProjectSnapshot {
  id: string;
  title: string;
  description: string | null;
  savedAt: string;
  passages: OfflinePassage[];
}

export function toOfflineSnapshot(
  project: SnapshotProjectInput,
  savedAt: string = new Date().toISOString()
): OfflineProjectSnapshot {
  return {
    id: project.id,
    title: project.title,
    description: project.description ?? null,
    savedAt,
    passages: [...project.passages]
      .sort((a, b) => a.number - b.number)
      .map((p) => ({
        number: p.number,
        title: p.title ?? null,
        content: p.content,
        isStart: Boolean(p.isStart),
        isEndpoint: Boolean(p.isEndpoint),
        links: (p.outgoingLinks ?? []).map((l) => ({
          targetNumber: l.target.number,
          linkText: l.linkText ?? null,
          condition: l.condition ?? null,
        })),
      })),
  };
}

export function startPassageNumber(snapshot: OfflineProjectSnapshot): number | null {
  const start = snapshot.passages.find((p) => p.isStart);
  if (start) return start.number;
  const first = snapshot.passages[0];
  return first ? first.number : null;
}

export function findPassage(
  snapshot: OfflineProjectSnapshot,
  number: number
): OfflinePassage | null {
  return snapshot.passages.find((p) => p.number === number) ?? null;
}
