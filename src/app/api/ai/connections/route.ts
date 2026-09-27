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

const connectionsSchema = z.object({
  connections: z
    .array(
      z.object({
        sourceNumber: z.number().int().min(1),
        targetNumber: z.number().int().min(1),
        type: z.enum(["explicit", "implicit", "suggested"]),
        text: z.string().max(120),
        confidence: z.number().min(0).max(1),
      })
    )
    .max(200),
});

const SYSTEM_PROMPT = [
  "You are an editorial agent for interactive gamebooks (choose-your-own-adventure books).",
  "You receive numbered passages and must find narrative connections: which passage should link to which.",
  'Return ONLY JSON: {"connections":[{"sourceNumber":n,"targetNumber":n,"type":"explicit"|"implicit"|"suggested","text":"short link label","confidence":0.0}]}',
  "type: explicit = the passage text explicitly references the other passage; implicit = the plot strongly implies continuing there; suggested = a plausible thematic option.",
  "Never suggest self-links or links to unknown numbers. Prefer quality over quantity: only plausible connections.",
  'The "text" label must be short (max 8 words) and written in the same language as the passages.',
  "confidence is between 0 and 1.",
].join("\n");

const MAX_CONTENT_PER_PASSAGE = 1200;
const MAX_PROMPT_CHARS = 60_000;

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
      include: {
        passages: {
          orderBy: { number: "asc" },
          select: {
            number: true,
            content: true,
            outgoingLinks: { select: { target: { select: { number: true } } } },
          },
        },
      },
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

    const validNumbers = new Set(project.passages.map((p) => p.number));
    const existingPairs = new Set(
      project.passages.flatMap((p) =>
        p.outgoingLinks.map((l) => `${p.number}->${l.target.number}`)
      )
    );

    let usedChars = 0;
    const blocks: string[] = [];
    let truncated = false;
    for (const p of project.passages) {
      let content = p.content;
      if (content.length > MAX_CONTENT_PER_PASSAGE) {
        content = content.slice(0, MAX_CONTENT_PER_PASSAGE) + "…";
      }
      const block = `\n## ${p.number}\n${content}`;
      if (usedChars + block.length > MAX_PROMPT_CHARS) {
        truncated = true;
        break;
      }
      blocks.push(block);
      usedChars += block.length;
    }

    const existingNote = existingPairs.size
      ? `\n\nAlready linked pairs (do not repeat them): ${[...existingPairs]
          .slice(0, 300)
          .join(", ")}`
      : "";

    const userPrompt = `Passages of the gamebook "${project.title}":\n${blocks.join("\n")}${
      truncated ? "\n\n(The list of passages was truncated by length limit; only suggest links among the passages shown above.)" : ""
    }${existingNote}`;

    let parsed: unknown;
    try {
      parsed = await chatJson(SYSTEM_PROMPT, userPrompt, 4096);
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

    const validated = connectionsSchema.safeParse(parsed);
    if (!validated.success) {
      return NextResponse.json(
        { error: "La IA devolvió una respuesta inválida", code: "AI_BAD_OUTPUT" },
        { status: 502 }
      );
    }

    const seen = new Set<string>();
    const connections = validated.data.connections.filter((c) => {
      if (!validNumbers.has(c.sourceNumber) || !validNumbers.has(c.targetNumber)) return false;
      if (c.sourceNumber === c.targetNumber) return false;
      const pair = `${c.sourceNumber}->${c.targetNumber}`;
      if (existingPairs.has(pair) || seen.has(pair)) return false;
      seen.add(pair);
      return true;
    });

    return NextResponse.json({ connections, truncated });
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
    console.error("AI connections error:", error);
    return NextResponse.json({ error: "Error al consultar la IA" }, { status: 500 });
  }
}
