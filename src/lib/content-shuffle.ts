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

export interface ShuffleMutationInput {
  id: string;
  number: number;
  title?: string | null;
  content: string;
  isEndpoint: boolean;
  outgoingLinks: {
    targetId: string;
    linkText?: string | null;
    condition?: string | null;
  }[];
}

export interface PassageMutation {
  id: string;
  content: string;
  title?: string | null;
  isEndpoint?: boolean;
}

export interface LinkMutation {
  sourceId: string;
  targetId: string;
  linkText?: string | null;
  condition?: string | null;
}

export function computeShuffleMutations(
  passages: ShuffleMutationInput[],
  plan: ContentShufflePlan
): { passageUpdates: PassageMutation[]; newLinks: LinkMutation[] } {
  const byNumber = new Map(passages.map((p) => [p.number, p]));
  const byId = new Map(passages.map((p) => [p.id, p]));

  const passageUpdates: PassageMutation[] = [];
  for (const slot of passages) {
    const storyNumber = plan.slotToStory.get(slot.number);
    if (storyNumber === undefined) continue;
    const story = byNumber.get(storyNumber);
    if (!story) continue;

    const newContent = rewriteShuffledContent(story.content, plan);

    if (storyNumber === slot.number) {
      if (newContent !== story.content) {
        passageUpdates.push({ id: slot.id, content: newContent });
      }
    } else {
      passageUpdates.push({
        id: slot.id,
        content: newContent,
        title: story.title,
        isEndpoint: story.isEndpoint,
      });
    }
  }

  const newLinks: LinkMutation[] = [];
  for (const story of passages) {
    const sourceSlotNumber = plan.storyToSlot.get(story.number);
    if (sourceSlotNumber === undefined) continue;
    const sourceSlot = byNumber.get(sourceSlotNumber);
    if (!sourceSlot) continue;

    for (const link of story.outgoingLinks) {
      const targetStory = byId.get(link.targetId);
      if (!targetStory) continue;
      const targetSlotNumber = plan.storyToSlot.get(targetStory.number);
      if (targetSlotNumber === undefined) continue;
      const targetSlot = byNumber.get(targetSlotNumber);
      if (!targetSlot) continue;
      if (sourceSlot.id === targetSlot.id) continue;

      newLinks.push({
        sourceId: sourceSlot.id,
        targetId: targetSlot.id,
        linkText: link.linkText
          ? rewriteShuffledContent(link.linkText, plan)
          : link.linkText,
        condition: link.condition,
      });
    }
  }

  return { passageUpdates, newLinks };
}
