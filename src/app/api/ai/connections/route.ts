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
import { buildConnectionsSystemPrompt, buildConnectionsUserPrompt } from "@/lib/prompts";
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

const SYSTEM_PROMPT = buildConnectionsSystemPrompt();

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

    const { prompt: userPrompt, truncated } = buildConnectionsUserPrompt({
      title: project.title,
      passages: project.passages.map((p) => ({ number: p.number, content: p.content })),
      existingPairs: [...existingPairs],
    });

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
