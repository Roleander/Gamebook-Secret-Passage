import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveExtAuth } from "@/lib/ext-auth";
import { parseFile } from "@/lib/parsers";
import { getEntitlements, limitReached } from "@/lib/entitlements";
import { importParsedResult } from "@/lib/import-text";
import { z } from "zod";

export const dynamic = "force-dynamic";

const importSchema = z.object({
  projectId: z.string().min(1),
  filename: z.string().max(200).optional(),
  rawContent: z.string().min(1).max(4 * 1024 * 1024),
});

const MAX_SIZE_MESSAGE = "Captura demasiado grande. Máximo 4MB.";

export async function POST(req: Request) {
  try {
    const auth = await resolveExtAuth(req);
    if (!auth) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const parsed = importSchema.safeParse(body);
    if (!parsed.success) {
      const tooLarge = parsed.error.issues.some(
        (i) => i.path[0] === "rawContent" && i.code === "too_big"
      );
      return NextResponse.json(
        { error: tooLarge ? MAX_SIZE_MESSAGE : "Datos inválidos" },
        { status: 400 }
      );
    }

    const project = await db.project.findFirst({
      where: { id: parsed.data.projectId, userId: auth.userId },
      select: { id: true },
    });
    if (!project) {
      return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
    }

    let filename = (parsed.data.filename || "captura.txt").trim() || "captura.txt";
    if (!filename.includes(".")) filename += ".txt";

    let result;
    try {
      result = await parseFile(Buffer.from(parsed.data.rawContent, "utf8"), filename);
    } catch (parseError) {
      const msg = parseError instanceof Error ? parseError.message : String(parseError);
      return NextResponse.json(
        { error: `Error al procesar el contenido: ${msg}` },
        { status: 400 }
      );
    }

    if (result.errors.length > 0 && result.passages.length === 0) {
      return NextResponse.json(
        { error: "No se pudo procesar el contenido", details: result.errors },
        { status: 400 }
      );
    }

    const ents = await getEntitlements(auth.userId, auth.role);
    const outcome = await importParsedResult(project.id, result, ents);

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
        projectId: project.id,
        filename,
        fileType: filename.split(".").pop() || "unknown",
        passagesCount: outcome.createdCount,
        rawContent: parsed.data.rawContent,
      },
    });

    return NextResponse.json({
      message: "Contenido importado exitosamente",
      passagesCount: outcome.createdCount,
      linksCreated: outcome.linksCreated,
      errors: result.errors,
      warnings: [...result.warnings, ...outcome.warnings],
      ...(outcome.skippedNumbers.length > 0 && {
        skippedCount: outcome.skippedNumbers.length,
      }),
    });
  } catch (error) {
    console.error("Ext import error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `Error interno: ${msg}` }, { status: 500 });
  }
}
