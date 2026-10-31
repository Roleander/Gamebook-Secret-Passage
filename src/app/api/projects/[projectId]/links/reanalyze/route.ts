import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { getEntitlements } from "@/lib/entitlements";
import { syncProjectLinks } from "@/lib/link-sync";
import { createConnectionFinder } from "@/lib/agents/connection-finder";
import { createProjectSnapshot } from "@/lib/snapshots";
import { missingReferenceTargets } from "@/lib/reference-mentions";
import { z } from "zod";
import { parseOr400 } from "@/lib/api-validate";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  includeAi: z.boolean().optional().default(false),
});

export async function POST(req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { projectId } = await params;
    const project = await db.project.findFirst({
      where: { id: projectId, userId: session.user.id },
      include: {
        passages: {
          orderBy: { number: "asc" },
          select: { id: true, number: true, content: true, outgoingLinks: { select: { target: { select: { number: true } } } } },
        },
      },
    });
    if (!project) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });

    const parsed = parseOr400(bodySchema, await req.json().catch(() => ({})));
    if (!parsed.ok) return parsed.response;

    await createProjectSnapshot(projectId, "Re-análisis de enlaces").catch(() => {});

    const linksCreated = await syncProjectLinks(projectId);

    const finder = createConnectionFinder();
    const { connections } = finder.findConnections(project.passages.map((p) => ({ number: p.number, content: p.content })));
    const existingPairs = new Set(project.passages.flatMap((p) => p.outgoingLinks.map((l) => `${p.number}->${l.target.number}`)));
    const seen = new Set<string>();
    const newConnections = connections.filter((c) => {
      if (c.sourceNumber === c.targetNumber) return false;
      const pair = `${c.sourceNumber}->${c.targetNumber}`;
      if (existingPairs.has(pair) || seen.has(pair)) return false;
      seen.add(pair);
      return true;
    });

    let suggestionsPersisted = 0;
    if (newConnections.length > 0) {
      for (const connection of newConnections) {
        try {
          await db.suggestion.upsert({
            where: { projectId_sourceNumber_targetNumber: { projectId, sourceNumber: connection.sourceNumber, targetNumber: connection.targetNumber } },
            update: { type: connection.type, text: connection.text, confidence: connection.confidence, status: "pending" },
            create: { projectId, sourceNumber: connection.sourceNumber, targetNumber: connection.targetNumber, type: connection.type, text: connection.text, confidence: connection.confidence, status: "pending" },
          });
          suggestionsPersisted++;
        } catch {
          // Keep the operation resilient even if one suggestion conflicts.
        }
      }
    }

    const finalPassages = await db.passage.findMany({ where: { projectId }, select: { number: true, content: true } });
    const numbers = new Set(finalPassages.map((p) => p.number));
    const ghostReferenceCount = finalPassages.reduce((total, passage) => total + missingReferenceTargets(passage.content, numbers).length, 0);

    return NextResponse.json({
      linksCreated,
      suggestionsPersisted,
      possibleConnections: newConnections.length,
      ghostReferenceCount,
      passageCount: finalPassages.length,
    });
  } catch (error) {
    console.error("Re-analysis error", error);
    return NextResponse.json({ error: "Error al re-analizar enlaces" }, { status: 500 });
  }
}