import { db } from "@/lib/db";
import type { Entitlements } from "@/lib/entitlements";
import type { FileParseResult } from "@/lib/parsers";

export interface ImportOutcome {
  createdCount: number;
  linksCreated: number;
  skippedNumbers: number[];
  warnings: string[];
  capReached: boolean;
}

export async function importParsedResult(
  projectId: string,
  result: FileParseResult,
  ents: Entitlements
): Promise<ImportOutcome> {
  const seenNumbers = new Set<number>();
  const uniquePassages = result.passages.filter((p) => {
    if (seenNumbers.has(p.number)) return false;
    seenNumbers.add(p.number);
    return true;
  });

  const existingPassages = await db.passage.findMany({
    where: { projectId },
    select: { number: true },
  });
  const existingNumbers = new Set(existingPassages.map((p) => p.number));
  const maxPassageNumber =
    existingPassages.length > 0
      ? Math.max(...existingPassages.map((p) => p.number))
      : 0;
  const startNumber = existingPassages.length > 0 ? maxPassageNumber + 1 : 0;

  const passageData: Array<{
    projectId: string;
    number: number;
    title?: string;
    content: string;
    sortOrder: number;
    isStart: boolean;
    isEndpoint: boolean;
  }> = [];
  const skippedNumbers: number[] = [];
  const warnings: string[] = [];

  for (let index = 0; index < uniquePassages.length; index++) {
    const passage = uniquePassages[index];
    const finalNumber = startNumber + passage.number;

    if (existingNumbers.has(finalNumber)) {
      skippedNumbers.push(finalNumber);
      continue;
    }

    passageData.push({
      projectId,
      number: Math.round(finalNumber),
      title: passage.title,
      content: passage.content,
      sortOrder: index,
      isStart: passage.isStart && index === 0,
      isEndpoint: passage.isEndpoint,
    });
    existingNumbers.add(Math.round(finalNumber));
  }

  if (passageData.length === 0) {
    return { createdCount: 0, linksCreated: 0, skippedNumbers, warnings, capReached: false };
  }

  if (ents.maxPassages !== null) {
    const allowed = Math.max(ents.maxPassages - existingPassages.length, 0);
    if (allowed === 0) {
      return { createdCount: 0, linksCreated: 0, skippedNumbers, warnings, capReached: true };
    }
    if (passageData.length > allowed) {
      const totalToImport = passageData.length;
      passageData.length = allowed;
      warnings.push(
        `Se importaron ${allowed} de ${totalToImport} pasajes para respetar el límite de ${ents.maxPassages} pasajes de tu plan. Mejora a Pro para importar sin límite.`
      );
    }
  }

  await db.passage.createMany({
    data: passageData,
  });

  const allPassages = await db.passage.findMany({
    where: { projectId },
    orderBy: { number: "asc" },
  });

  let linksCreated = 0;

  for (const link of result.links) {
    const sourcePassage = allPassages.find(
      (p) => p.number === Math.round(startNumber + link.sourceNumber)
    );
    const targetPassage = allPassages.find(
      (p) => p.number === Math.round(startNumber + link.targetNumber)
    );

    if (!sourcePassage || !targetPassage) continue;

    const existingLink = await db.passageLink.findUnique({
      where: {
        sourceId_targetId: {
          sourceId: sourcePassage.id,
          targetId: targetPassage.id,
        },
      },
    });

    if (!existingLink) {
      await db.passageLink.create({
        data: {
          sourceId: sourcePassage.id,
          targetId: targetPassage.id,
          linkText: link.text,
        },
      });
      linksCreated++;
    }
  }

  for (let i = 0; i < allPassages.length; i++) {
    const passage = allPassages[i];
    if (passage.isEndpoint) continue;

    const originalNumber = passage.number - startNumber;
    const hasOptions = result.passages.find(
      (p) => Math.round(p.number) === Math.round(originalNumber)
    )?.options?.some((o) => o.type !== "dice");

    if (hasOptions && i + 1 < allPassages.length) {
      const nextPassage = allPassages[i + 1];

      const existingImplicitLink = await db.passageLink.findUnique({
        where: {
          sourceId_targetId: {
            sourceId: passage.id,
            targetId: nextPassage.id,
          },
        },
      });

      if (!existingImplicitLink) {
        await db.passageLink.create({
          data: {
            sourceId: passage.id,
            targetId: nextPassage.id,
            linkText: "Continuar",
          },
        });
        linksCreated++;
      }
    }
  }

  return {
    createdCount: passageData.length,
    linksCreated,
    skippedNumbers,
    warnings,
    capReached: false,
  };
}
