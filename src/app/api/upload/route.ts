import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { parseFile } from "@/lib/parsers";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "No autorizado" },
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
        userId: (session.user as any).id,
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Proyecto no encontrado" },
        { status: 404 }
      );
    }

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse file — this now includes auto-created passages from unnumbered options
    const result = await parseFile(buffer, file.name);

    if (result.errors.length > 0 && result.passages.length === 0) {
      return NextResponse.json(
        { error: result.errors.join(", ") },
        { status: 400 }
      );
    }

    // Get existing max passage number
    const maxPassage = await db.passage.findFirst({
      where: { projectId },
      orderBy: { number: "desc" },
      select: { number: true },
    });

    // If project is empty, preserve original numbering
    // If project has passages, offset new numbers to avoid duplicates
    const hasExistingPassages = (maxPassage?.number || 0) > 0;
    const startNumber = hasExistingPassages ? (maxPassage!.number + 1) : 0;

    // Create passages in database
    const passageData = result.passages.map((passage, index) => ({
      projectId,
      number: startNumber + passage.number,
      title: passage.title,
      content: passage.content,
      sortOrder: index,
      isStart: passage.isStart && index === 0,
      isEndpoint: passage.isEndpoint,
    }));

    await db.passage.createMany({
      data: passageData,
    });

    // Get all created passages
    const allPassages = await db.passage.findMany({
      where: { projectId },
      orderBy: { number: "asc" },
    });

    let linksCreated = 0;

    // Create links from parsed result (offset numbers if needed)
    for (const link of result.links) {
      const sourcePassage = allPassages.find(p => p.number === startNumber + link.sourceNumber);
      const targetPassage = allPassages.find(p => p.number === startNumber + link.targetNumber);

      if (!sourcePassage || !targetPassage) continue;

      // Check if link already exists
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

    // Also create implicit "Continuar" links for passages with options
    for (let i = 0; i < allPassages.length; i++) {
      const passage = allPassages[i];
      if (passage.isEndpoint) continue;

      // Check if this passage has options in the parsed result
      const originalNumber = passage.number - startNumber;
      const hasOptions = result.passages.find(
        p => p.number === originalNumber
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

    // Create import history record
    await db.importHistory.create({
      data: {
        projectId,
        filename: file.name,
        fileType: file.name.split(".").pop() || "unknown",
        passagesCount: result.passages.length,
        rawContent: result.rawText.substring(0, 10000),
      },
    });

    return NextResponse.json({
      message: "Archivo importado exitosamente",
      passagesCount: result.passages.length,
      linksCreated,
      errors: result.errors,
      warnings: result.warnings,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Error al procesar el archivo" },
      { status: 500 }
    );
  }
}
