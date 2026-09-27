import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { getEntitlements, upgradeRequired } from "@/lib/entitlements";
import {
  chatJson,
  AiNotConfiguredError,
  AiRateLimitError,
  AiHttpError,
  AiOutputError,
} from "@/lib/ai";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const requestSchema = z.object({ projectId: z.string().min(1) });

const segmentsSchema = z.object({
  segments: z
    .array(
      z.object({
        title: z.string().max(300).nullish(),
        content: z.string().min(1),
      })
    )
    .min(1)
    .max(600),
});

const SYSTEM_PROMPT = [
  "You are an editorial agent for interactive gamebooks (choose-your-own-adventure books).",
  "You receive the raw text of a book (possibly a full document export) and must split it into passages.",
  "Split at chapter/scene markers: chapter titles, numbered headings (e.g. '1.', 'Chapter 3', 'Paso 2'), all-caps titles, markdown headings, or clear scene breaks.",
  "Each passage must be self-contained, coherent, and at least one paragraph long. Keep the original text unchanged inside each passage — do not rewrite or summarize it.",
  'Return ONLY JSON: {"segments":[{"title":"short title or null","content":"full original text of the passage"}]}',
  "The segments must cover the provided text in order. Titles and content must be in the same language as the source text.",
].join("\n");

const MAX_RAW_CHARS = 60_000;
const MAX_SEGMENTS = 400;

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const ents = await getEntitlements(session.user.id, session.user.role);
    if (!ents.features.analyze) {
      return upgradeRequired("analyze", "Los agentes de análisis requieren un plan Pro");
    }

    const body = await req.json().catch(() => null);
    const parsedBody = requestSchema.safeParse(body);
    if (!parsedBody.success) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    const project = await db.project.findFirst({
      where: { id: parsedBody.data.projectId, userId: session.user.id },
      select: { id: true, title: true },
    });
    if (!project) {
      return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
    }

    if (!process.env.AI_API_KEY) {
      return NextResponse.json(
        { error: "El servicio de IA no está configurado", code: "AI_NOT_CONFIGURED" },
        { status: 503 }
      );
    }

    const importHistory = await db.importHistory.findFirst({
      where: { projectId: project.id },
      orderBy: { importedAt: "desc" },
      select: { rawContent: true },
    });

    if (!importHistory?.rawContent) {
      return NextResponse.json(
        { error: "No hay contenido importado para segmentar" },
        { status: 400 }
      );
    }

    const raw = importHistory.rawContent;
    const truncated = raw.length > MAX_RAW_CHARS;
    const inputText = truncated ? raw.slice(0, MAX_RAW_CHARS) : raw;

    let parsed: unknown;
    try {
      parsed = await chatJson(
        SYSTEM_PROMPT,
        `Book title: ${project.title}\n\nRaw text:\n\n${inputText}`,
        8192
      );
    } catch (error) {
      if (
        error instanceof AiNotConfiguredError ||
        error instanceof AiRateLimitError ||
        error instanceof AiHttpError ||
        error instanceof AiOutputError
      ) {
        throw error;
      }
      throw new AiHttpError(0, String(error));
    }

    const validated = segmentsSchema.safeParse(parsed);
    if (!validated.success) {
      return NextResponse.json(
        { error: "La IA devolvió una respuesta inválida", code: "AI_BAD_OUTPUT" },
        { status: 502 }
      );
    }

    const segments = validated.data.segments
      .map((s) => ({
        title: s.title?.trim() ? s.title.trim() : null,
        content: s.content.trim(),
      }))
      .filter((s) => s.content.length > 0)
      .slice(0, MAX_SEGMENTS);

    if (segments.length === 0) {
      return NextResponse.json(
        { error: "La IA no detectó pasajes en el contenido", code: "AI_BAD_OUTPUT" },
        { status: 502 }
      );
    }

    return NextResponse.json({ segments, truncated });
  } catch (error) {
    if (error instanceof AiNotConfiguredError) {
      return NextResponse.json(
        { error: "El servicio de IA no está configurado", code: "AI_NOT_CONFIGURED" },
        { status: 503 }
      );
    }
    if (error instanceof AiRateLimitError) {
      return NextResponse.json(
        { error: "Límite de peticiones de IA alcanzado", code: "AI_RATE_LIMIT" },
        { status: 429 }
      );
    }
    if (error instanceof AiOutputError) {
      return NextResponse.json(
        { error: "La IA devolvió una respuesta inválida", code: "AI_BAD_OUTPUT" },
        { status: 502 }
      );
    }
    if (error instanceof AiHttpError) {
      console.error("AI upstream error:", error.message);
      return NextResponse.json(
        { error: "El servicio de IA falló", code: "AI_UPSTREAM" },
        { status: 502 }
      );
    }
    console.error("AI segment error:", error);
    return NextResponse.json({ error: "Error al consultar la IA" }, { status: 500 });
  }
}
