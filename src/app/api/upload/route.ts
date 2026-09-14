import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { parseFile } from "@/lib/parsers";
import { detectLinksInPassage } from "@/lib/parsers/txt";

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

    // Parse file
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

    const startNumber = (maxPassage?.number || 0) + 1;

    // Create passages in database
    const createdPassages = await db.passage.createMany({
      data: result.passages.map((passage, index) => ({
        projectId,
        number: startNumber + index,
        title: passage.title,
        content: passage.content,
        sortOrder: index,
        isStart: passage.isStart && index === 0,
        isEndpoint: passage.isEndpoint,
      })),
    });

    // Now auto-detect and create links
    const allPassages = await db.passage.findMany({
      where: { projectId },
      orderBy: { number: "asc" },
    });

    const passageNumbers = allPassages.map(p => p.number);
    let linksCreated = 0;

    for (const passage of allPassages) {
      const detectedLinks = detectLinksInPassage(passage.content, passageNumbers);

      for (const link of detectedLinks) {
        const targetPassage = allPassages.find(p => p.number === link.targetNumber);
        if (!targetPassage) continue;

        // Check if link already exists
        const existingLink = await db.passageLink.findUnique({
          where: {
            sourceId_targetId: {
              sourceId: passage.id,
              targetId: targetPassage.id,
            },
          },
        });

        if (!existingLink) {
          await db.passageLink.create({
            data: {
              sourceId: passage.id,
              targetId: targetPassage.id,
              linkText: link.text,
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
        passagesCount: createdPassages.count,
        rawContent: result.rawText.substring(0, 10000),
      },
    });

    return NextResponse.json({
      message: "Archivo importado exitosamente",
      passagesCount: createdPassages.count,
      linksCreated,
      errors: result.errors,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Error al procesar el archivo" },
      { status: 500 }
    );
  }
}
