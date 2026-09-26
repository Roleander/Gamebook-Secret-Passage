import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { parseFile } from "@/lib/parsers";
import { getEntitlements, limitReached } from "@/lib/entitlements";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Debes iniciar sesión para importar archivos" },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const projectId = formData.get("projectId") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "No se proporcionó archivo" },
        { status: 400 }
      );
    }

    if (!projectId) {
      return NextResponse.json(
        { error: "No se proporcionó ID del proyecto" },
        { status: 400 }
      );
    }

    // Verify project belongs to user
    const project = await db.project.findFirst({
      where: {
        id: projectId,
        userId: session.user.id,
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Proyecto no encontrado" },
        { status: 404 }
      );
    }

    // Validate file size (max 4MB — Vercel Hobby plan limit)
    const maxSize = 4 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `Archivo demasiado grande (${(file.size / 1024 / 1024).toFixed(1)}MB). Máximo 4MB.` },
        { status: 400 }
      );
    }

    // Read file buffer
    let buffer: Buffer;
    try {
      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } catch {
      return NextResponse.json(
        { error: "No se pudo leer el archivo. Puede estar corrupto o ser demasiado grande." },
        { status: 400 }
      );
    }

    // Parse file
    let result;
    try {
      result = await parseFile(buffer, file.name);
    } catch (parseError) {
      const msg = parseError instanceof Error ? parseError.message : String(parseError);
      return NextResponse.json(
        { error: `Error al procesar el archivo: ${msg}` },
        { status: 400 }
      );
    }

    if (result.errors.length > 0 && result.passages.length === 0) {
      return NextResponse.json(
        {
          error: "No se pudo procesar el archivo",
          details: result.errors,
        },
        { status: 400 }
      );
    }

    // Deduplicate passages by number (keep first occurrence)
    const seenNumbers = new Set<number>();
    const uniquePassages = result.passages.filter(p => {
      if (seenNumbers.has(p.number)) return false;
      seenNumbers.add(p.number);
      return true;
    });

    // Get existing passage numbers in this project
    const existingPassages = await db.passage.findMany({
      where: { projectId },
      select: { number: true },
    });
    const existingNumbers = new Set(existingPassages.map(p => p.number));

    // Calculate offset: if project has passages, offset to avoid collisions
    const maxPassageNumber = existingPassages.length > 0
      ? Math.max(...existingPassages.map(p => p.number))
      : 0;
    const hasExistingPassages = existingPassages.length > 0;
    const startNumber = hasExistingPassages ? (maxPassageNumber + 1) : 0;

    // Create passages, skip any that would collide with existing numbers
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

    for (let index = 0; index < uniquePassages.length; index++) {
      const passage = uniquePassages[index];
      const finalNumber = startNumber + passage.number;

      // Skip if this number already exists
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
      return NextResponse.json(
        { error: "No se pudieron crear pasajes. Todos los números ya existen en el proyecto." },
        { status: 400 }
      );
    }

    const ents = await getEntitlements(session.user.id, session.user.role);
    if (ents.maxPassages !== null) {
      const allowed = Math.max(ents.maxPassages - existingPassages.length, 0);
      if (allowed === 0) {
        return limitReached(
          `Has alcanzado el límite de ${ents.maxPassages} pasajes de tu plan. Mejora a Pro para importar más.`
        );
      }
      if (passageData.length > allowed) {
        const totalToImport = passageData.length;
        passageData.length = allowed;
        result.warnings.push(
          `Se importaron ${allowed} de ${totalToImport} pasajes para respetar el límite de ${ents.maxPassages} pasajes de tu plan. Mejora a Pro para importar sin límite.`
        );
      }
    }

    await db.passage.createMany({
      data: passageData,
    });

    // Get all created passages
    const allPassages = await db.passage.findMany({
      where: { projectId },
      orderBy: { number: "asc" },
    });

    let linksCreated = 0;

    // Create links from parsed result
    for (const link of result.links) {
      const sourcePassage = allPassages.find(p => p.number === Math.round(startNumber + link.sourceNumber));
      const targetPassage = allPassages.find(p => p.number === Math.round(startNumber + link.targetNumber));

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

    // Create implicit "Continuar" links
    for (let i = 0; i < allPassages.length; i++) {
      const passage = allPassages[i];
      if (passage.isEndpoint) continue;

      const originalNumber = passage.number - startNumber;
      const hasOptions = result.passages.find(
        p => Math.round(p.number) === Math.round(originalNumber)
      )?.options?.some(o => o.type !== "dice");

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

    // Create import history
    await db.importHistory.create({
      data: {
        projectId,
        filename: file.name,
        fileType: file.name.split(".").pop() || "unknown",
        passagesCount: passageData.length,
        rawContent: result.rawText.substring(0, 10000),
      },
    });

    return NextResponse.json({
      message: "Archivo importado exitosamente",
      passagesCount: passageData.length,
      linksCreated,
      errors: result.errors,
      warnings: result.warnings,
      ...(skippedNumbers.length > 0 && {
        skippedCount: skippedNumbers.length,
        skippedMessage: `${skippedNumbers.length} pasajes omitidos (números ya existentes)`,
      }),
    });
  } catch (error) {
    console.error("Upload error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Error interno al procesar el archivo: ${msg}` },
      { status: 500 }
    );
  }
}
