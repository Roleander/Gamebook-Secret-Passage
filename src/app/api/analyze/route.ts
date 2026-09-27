import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { getEntitlements, upgradeRequired, limitReached } from "@/lib/entitlements";
import { createPassageDetector } from "@/lib/agents";
import { replaceProjectPassages } from "@/lib/passages-replace";
import { z } from "zod";

export const dynamic = "force-dynamic";

const applyConnectionsSchema = z.object({
  projectId: z.string().min(1),
  links: z
    .array(
      z.object({
        sourceNumber: z.number().int(),
        targetNumber: z.number().int(),
        text: z.string().max(300).optional(),
      })
    )
    .min(1)
    .max(200),
});

const applyDetectionSchema = z.object({
  projectId: z.string().min(1),
  segments: z
    .array(
      z.object({
        title: z.string().max(300).nullish(),
        content: z.string().min(1).max(50_000),
      })
    )
    .min(1)
    .max(600)
    .optional(),
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    const ents = await getEntitlements(session.user.id, session.user.role);
    if (!ents.features.analyze) {
      return upgradeRequired("analyze", "Los agentes de análisis requieren un plan Pro");
    }

    const body = await req.json().catch(() => null);

    if (body && typeof body === "object" && "links" in body) {
      const parsed = applyConnectionsSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Datos inválidos", details: parsed.error.issues.map((i) => i.message) },
          { status: 400 }
        );
      }

      const project = await db.project.findFirst({
        where: { id: parsed.data.projectId, userId: session.user.id },
        include: { passages: { select: { id: true, number: true } } },
      });
      if (!project) {
        return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
      }

      const byNumber = new Map(project.passages.map((p) => [p.number, p.id]));
      let created = 0;
      let skipped = 0;
      const missing: number[] = [];

      for (const link of parsed.data.links) {
        const sourceId = byNumber.get(link.sourceNumber);
        const targetId = byNumber.get(link.targetNumber);

        if (!sourceId || !targetId || sourceId === targetId) {
          if (!sourceId) missing.push(link.sourceNumber);
          if (!targetId) missing.push(link.targetNumber);
          continue;
        }

        const existing = await db.passageLink.findUnique({
          where: { sourceId_targetId: { sourceId, targetId } },
        });
        if (existing) {
          skipped++;
          continue;
        }

        await db.passageLink.create({
          data: {
            sourceId,
            targetId,
            linkText: link.text ?? `Ve al pasaje ${link.targetNumber}`,
          },
        });
        created++;
      }

      return NextResponse.json({
        created,
        skipped,
        missing: [...new Set(missing)],
      });
    }

    if (body && typeof body === "object" && "projectId" in body) {
      const parsed = applyDetectionSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Datos inválidos" },
          { status: 400 }
        );
      }

      const project = await db.project.findFirst({
        where: { id: parsed.data.projectId, userId: session.user.id },
      });
      if (!project) {
        return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
      }

      const importHistory = await db.importHistory.findFirst({
        where: { projectId: parsed.data.projectId },
        orderBy: { importedAt: "desc" },
      });

      let segments: { title: string | null; content: string }[];

      if (parsed.data.segments) {
        segments = parsed.data.segments
          .map((s) => ({ title: s.title ?? null, content: s.content.trim() }))
          .filter((s) => s.content.length > 0);
      } else {
        if (!importHistory?.rawContent) {
          return NextResponse.json(
            { error: "No hay contenido raw para analizar" },
            { status: 400 }
          );
        }

        const detector = createPassageDetector();
        const detected = detector.detect(importHistory.rawContent);
        segments = detected
          .filter((d) => d.content.trim().length > 0)
          .map((d) => ({ title: null, content: d.content.trim() }));
      }

      if (segments.length === 0) {
        return NextResponse.json(
          { error: "No se detectaron pasajes en el contenido" },
          { status: 400 }
        );
      }

      if (ents.maxPassages !== null && segments.length > ents.maxPassages) {
        return limitReached(
          `La detección generaría ${segments.length} pasajes y tu plan permite ${ents.maxPassages}. Mejora a Pro para aplicarla.`
        );
      }

      const result = await replaceProjectPassages(
        parsed.data.projectId,
        segments,
        [],
        "Aplicar Detección"
      );

      return NextResponse.json({
        message: `Detección aplicada: ${result.passageCount} pasajes`,
        passageCount: result.passageCount,
        linksCreated: result.linksCreated,
        snapshotId: result.snapshotId,
      });
    }

    return NextResponse.json(
      { error: "Envía links (apply_connections) o projectId (apply_detection)" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error analyzing:", error);
    return NextResponse.json(
      { error: "Error al analizar el proyecto" },
      { status: 500 }
    );
  }
}
