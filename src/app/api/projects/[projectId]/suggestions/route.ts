import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { normalizeSuggestions } from "@/lib/suggestions";

export const dynamic = "force-dynamic";

const SuggestionsSchema = z.object({
  suggestions: z
    .array(
      z.object({
        sourceNumber: z.number().int(),
        targetNumber: z.number().int(),
        type: z.string().optional(),
        text: z.string().nullish(),
        confidence: z.number().optional(),
      })
    )
    .max(500),
});

const STATUSES = ["pending", "accepted", "rejected"];

export async function GET(
  req: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await context.params;
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const project = await db.project.findFirst({
      where: { id: projectId, userId: session.user.id },
      select: { id: true },
    });
    if (!project) {
      return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
    }

    const statusParam = new URL(req.url).searchParams.get("status");
    const status = statusParam && STATUSES.includes(statusParam) ? statusParam : "pending";

    const suggestions = await db.suggestion.findMany({
      where: { projectId, status },
      orderBy: [{ confidence: "desc" }, { createdAt: "asc" }],
      select: {
        id: true,
        sourceNumber: true,
        targetNumber: true,
        type: true,
        text: true,
        confidence: true,
        status: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error("Error listing suggestions:", error);
    return NextResponse.json({ error: "Error al listar sugerencias" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await context.params;
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const project = await db.project.findFirst({
      where: { id: projectId, userId: session.user.id },
      select: { id: true },
    });
    if (!project) {
      return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
    }

    const body = await req.json().catch(() => null);
    const parsed = SuggestionsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    const passages = await db.passage.findMany({
      where: { projectId },
      select: { number: true },
    });
    const numbers = passages.map((p) => p.number);

    const normalized = normalizeSuggestions(numbers, parsed.data.suggestions);

    let created = 0;
    for (const item of normalized) {
      const existing = await db.suggestion.findUnique({
        where: {
          projectId_sourceNumber_targetNumber: {
            projectId,
            sourceNumber: item.sourceNumber,
            targetNumber: item.targetNumber,
          },
        },
        select: { id: true, status: true },
      });

      if (existing) {
        // Re-open only if the user had not decided yet (refresh confidence/type)
        if (existing.status === "pending") {
          await db.suggestion.update({
            where: { id: existing.id },
            data: { type: item.type, text: item.text, confidence: item.confidence },
          });
        }
        continue;
      }

      await db.suggestion.create({
        data: {
          projectId,
          sourceNumber: item.sourceNumber,
          targetNumber: item.targetNumber,
          type: item.type,
          text: item.text,
          confidence: item.confidence,
        },
      });
      created += 1;
    }

    return NextResponse.json({ stored: normalized.length, created }, { status: 201 });
  } catch (error) {
    console.error("Error saving suggestions:", error);
    return NextResponse.json({ error: "Error al guardar sugerencias" }, { status: 500 });
  }
}
