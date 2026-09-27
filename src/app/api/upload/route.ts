import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { parseFile } from "@/lib/parsers";
import { getEntitlements, limitReached } from "@/lib/entitlements";
import { importParsedResult } from "@/lib/import-text";

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

    const ents = await getEntitlements(session.user.id, session.user.role);
    const outcome = await importParsedResult(projectId, result, ents);

    if (outcome.capReached) {
      return limitReached(
        `Has alcanzado el límite de ${ents.maxPassages} pasajes de tu plan. Mejora a Pro para importar más.`
      );
    }

    if (outcome.createdCount === 0) {
      return NextResponse.json(
        { error: "No se pudieron crear pasajes. Todos los números ya existen en el proyecto." },
        { status: 400 }
      );
    }

    await db.importHistory.create({
      data: {
        projectId,
        filename: file.name,
        fileType: file.name.split(".").pop() || "unknown",
        passagesCount: outcome.createdCount,
        rawContent: result.rawText,
      },
    });

    return NextResponse.json({
      message: "Archivo importado exitosamente",
      passagesCount: outcome.createdCount,
      linksCreated: outcome.linksCreated,
      errors: result.errors,
      warnings: [...result.warnings, ...outcome.warnings],
      ...(outcome.skippedNumbers.length > 0 && {
        skippedCount: outcome.skippedNumbers.length,
        skippedMessage: `${outcome.skippedNumbers.length} pasajes omitidos (números ya existentes)`,
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
