import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { planBulkAccept } from "@/lib/suggestions";

export const dynamic = "force-dynamic";

const BulkSchema = z.object({
  action: z.enum(["accept", "reject"]),
});

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
    const parsed = BulkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    if (parsed.data.action === "reject") {
      const result = await db.suggestion.updateMany({
        where: { projectId, status: "pending" },
        data: { status: "rejected" },
      });
      return NextResponse.json({
        accepted: 0,
        rejected: result.count,
        failed: 0,
      });
    }

    const pending = await db.suggestion.findMany({
      where: { projectId, status: "pending" },
      select: { id: true, sourceNumber: true, targetNumber: true },
      orderBy: { createdAt: "asc" },
    });

    if (pending.length === 0) {
      return NextResponse.json({ accepted: 0, rejected: 0, failed: 0 });
    }

    const numbers = [
      ...new Set(pending.flatMap((s) => [s.sourceNumber, s.targetNumber])),
    ];
    const passages = await db.passage.findMany({
      where: { projectId, number: { in: numbers } },
      select: { id: true, number: true },
    });
    const passageIdByNumber = new Map(
      passages.map((p) => [p.number, p.id])
    );

    const candidatePairs = pending
      .map((s) => {
        const sourceId = passageIdByNumber.get(s.sourceNumber);
        const targetId = passageIdByNumber.get(s.targetNumber);
        return sourceId && targetId && sourceId !== targetId
          ? { sourceId, targetId }
          : null;
      })
      .filter((pair): pair is { sourceId: string; targetId: string } => !!pair);

    const sourceIds = [...new Set(candidatePairs.map((p) => p.sourceId))];
    const targetIdSet = new Set(candidatePairs.map((p) => p.targetId));
    const existingLinks = await db.passageLink.findMany({
      where: { sourceId: { in: sourceIds } },
      select: { sourceId: true, targetId: true },
    });
    const existingPairKeys = new Set(
      existingLinks
        .filter((l) => targetIdSet.has(l.targetId))
        .map((l) => `${l.sourceId}:${l.targetId}`)
    );

    const plan = planBulkAccept(pending, passageIdByNumber, existingPairKeys);

    await db.$transaction(async (tx) => {
      if (plan.toCreate.length > 0) {
        await tx.passageLink.createMany({
          data: plan.toCreate.map((link) => ({
            sourceId: link.sourceId,
            targetId: link.targetId,
            linkText: `Ve al pasaje ${link.targetNumber}`,
          })),
          skipDuplicates: true,
        });
      }

      await tx.suggestion.updateMany({
        where: { id: { in: plan.toAcceptIds } },
        data: { status: "accepted" },
      });

      if (plan.failedIds.length > 0) {
        await tx.suggestion.updateMany({
          where: { id: { in: plan.failedIds } },
          data: { status: "rejected" },
        });
      }
    });

    return NextResponse.json({
      accepted: plan.toAcceptIds.length,
      rejected: 0,
      failed: plan.failedIds.length,
    });
  } catch (error) {
    console.error("Error resolving suggestions in bulk:", error);
    return NextResponse.json({ error: "Error al procesar las sugerencias" }, { status: 500 });
  }
}
