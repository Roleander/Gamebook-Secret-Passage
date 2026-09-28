import { replaceNumberReferences } from "./number-references";

export interface ShufflePassageInput {
  number: number;
  isStart?: boolean;
}

export interface ContentShufflePlan {
  storyToSlot: Map<number, number>;
  slotToStory: Map<number, number>;
  startStory: number | null;
}

export function buildContentShufflePlan(
  passages: ShufflePassageInput[],
  options: { preserveStart?: boolean; rng?: () => number } = {}
): ContentShufflePlan {
  const preserveStart = options.preserveStart !== false;
  const rng = options.rng ?? Math.random;

  const sorted = [...passages].sort((a, b) => a.number - b.number);
  const start = preserveStart ? sorted.find((p) => p.isStart) ?? null : null;
  const pool = start ? sorted.filter((p) => p.number !== start.number) : sorted;

  const originalNumbers = pool.map((p) => p.number);
  const order = [...pool];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }

  const storyToSlot = new Map<number, number>();
  const slotToStory = new Map<number, number>();
  order.forEach((story, i) => {
    const slot = originalNumbers[i];
    storyToSlot.set(story.number, slot);
    slotToStory.set(slot, story.number);
  });

  if (start) {
    storyToSlot.set(start.number, start.number);
    slotToStory.set(start.number, start.number);
  }

  return { storyToSlot, slotToStory, startStory: start ? start.number : null };
}

export function rewriteShuffledContent(
  content: string,
  plan: ContentShufflePlan
): string {
  return replaceNumberReferences(content, plan.storyToSlot);
}
