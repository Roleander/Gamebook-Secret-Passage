import { db } from "@/lib/db";
import { detectLinksInPassage } from "@/lib/parsers/txt";

/**
 * Detecta referencias numéricas en el contenido de todos los pasajes del
 * proyecto y crea los enlaces (PassageLink) que falten. Solo crea, nunca
 * borra. Idempotente: no duplica enlaces existentes.
 *
 * Devuelve el número de enlaces creados.
 */
export async function syncProjectLinks(projectId: string): Promise<number> {
  const passages = await db.passage.findMany({
    where: { projectId },
    select: { id: true, number: true, content: true },
  });
  if (passages.length === 0) return 0;

  const byNumber = new Map(passages.map((p) => [p.number, p]));
  const numbers = passages.map((p) => p.number);

  const existingLinks = await db.passageLink.findMany({
    where: { source: { projectId } },
    select: { sourceId: true, targetId: true },
  });
  const existing = new Set(
    existingLinks.map((l) => `${l.sourceId}:${l.targetId}`)
  );

  const toCreate: { sourceId: string; targetId: string; linkText: string }[] =
    [];

  for (const passage of passages) {
    const detected = detectLinksInPassage(passage.content || "", numbers);
    for (const link of detected) {
      if (link.targetNumber === passage.number) continue;
      const target = byNumber.get(link.targetNumber);
      if (!target) continue;
      const key = `${passage.id}:${target.id}`;
      if (existing.has(key)) continue;
      existing.add(key);
      toCreate.push({
        sourceId: passage.id,
        targetId: target.id,
        linkText: link.text,
      });
    }
  }

  if (toCreate.length === 0) return 0;

  await db.passageLink.createMany({ data: toCreate });
  return toCreate.length;
}
