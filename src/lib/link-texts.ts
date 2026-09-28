import { db } from "@/lib/db";
import { replaceNumberReferences } from "./number-references";

type NumberMapping = Parameters<typeof replaceNumberReferences>[1];

export interface LinkTextInput {
  id: string;
  linkText: string | null;
}

export interface LinkTextUpdate {
  id: string;
  linkText: string;
}

export function rewriteLinkTexts(
  links: LinkTextInput[],
  mapping: NumberMapping
): LinkTextUpdate[] {
  const updates: LinkTextUpdate[] = [];
  for (const link of links) {
    if (!link.linkText) continue;
    const next = replaceNumberReferences(link.linkText, mapping);
    if (next !== link.linkText) {
      updates.push({ id: link.id, linkText: next });
    }
  }
  return updates;
}

export async function rewriteProjectLinkTexts(
  projectId: string,
  mapping: NumberMapping
): Promise<number> {
  const links = await db.passageLink.findMany({
    where: { source: { projectId } },
    select: { id: true, linkText: true },
  });

  const updates = rewriteLinkTexts(links, mapping);
  if (updates.length === 0) return 0;

  await db.$transaction(
    updates.map((u) =>
      db.passageLink.update({
        where: { id: u.id },
        data: { linkText: u.linkText },
      })
    )
  );
  return updates.length;
}
