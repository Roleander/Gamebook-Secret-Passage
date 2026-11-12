import { db } from "@/lib/db";
import type { Entitlements } from "@/lib/entitlements";
import type { FileParseResult } from "@/lib/parsers";
import { replaceNumberReferences } from "@/lib/number-references";

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
  const existingPassages = await db.passage.findMany({
    where: { projectId },
    select: { number: true, sortOrder: true },
  });
  const projectEmpty = existingPassages.length === 0;
  const maxPassageNumber = projectEmpty
    ? 0
    : Math.max(...existingPassages.map((p) => p.number));
  // En un proyecto vacío se conserva la numeración original. Si ya hay
  // pasajes, se desplaza lo justo para no chocar con los existentes.
  const offset = projectEmpty
    ? 0
    : Number.isInteger(maxPassageNumber)
      ? maxPassageNumber
      : Math.floor(maxPassageNumber) + 1;
  const baseSortOrder = projectEmpty
    ? 0
    : Math.max(...existingPassages.map((p) => p.sortOrder ?? 0)) + 1;

  const passageData: Array<{
    projectId: string;
    number: number;
    title?: string;
    content: string;
    sortOrder: number;
    isStart: boolean;
    isEndpoint: boolean;
  }> = [];
  const warnings: string[] = [];
  const skippedNumbers: number[] = [];
  const numberMapping = new Map<number, number>();
  const usedNumbers = new Set(existingPassages.map((p) => p.number));

  const nextFreeNumber = () => {
    let candidate = Math.floor(Math.max(0, ...usedNumbers)) + 1;
    while (usedNumbers.has(candidate)) candidate++;
    return candidate;
  };

  for (let index = 0; index < result.passages.length; index++) {
    const passage = result.passages[index];

    if (!Number.isInteger(passage.number)) {
      warnings.push(`Pasaje ${passage.number}: número no entero; omitido.`);
      continue;
    }

    let finalNumber = projectEmpty ? passage.number : passage.number + offset;

    if (usedNumbers.has(finalNumber)) {
      finalNumber = nextFreeNumber();
      warnings.push(
        `Pasaje ${passage.number} duplicado → importado como ${finalNumber}.`
      );
    }

    usedNumbers.add(finalNumber);
    if (!numberMapping.has(passage.number)) {
      numberMapping.set(passage.number, finalNumber);
    }

    passageData.push({
      projectId,
      number: finalNumber,
      title: passage.title,
      content: passage.content,
      sortOrder: baseSortOrder + passageData.length,
      isStart: projectEmpty && passageData.length === 0 && passage.isStart,
      isEndpoint: passage.isEndpoint,
    });
  }

  for (const data of passageData) {
    data.content = replaceNumberReferences(data.content, numberMapping);
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
    const sourceFinal = numberMapping.get(link.sourceNumber);
    const targetFinal = numberMapping.get(link.targetNumber);
    if (sourceFinal === undefined || targetFinal === undefined) continue;

    const sourcePassage = allPassages.find((p) => p.number === sourceFinal);
    const targetPassage = allPassages.find((p) => p.number === targetFinal);

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

  return {
    createdCount: passageData.length,
    linksCreated,
    skippedNumbers,
    warnings,
    capReached: false,
  };
}
