import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { getEntitlements, upgradeRequired } from "@/lib/entitlements";
import { replaceNumberReferences } from "@/lib/number-references";
import { rewriteProjectLinkTexts } from "@/lib/link-texts";
import { z } from "zod";
import { parseOr400 } from "@/lib/api-validate";

export const dynamic = "force-dynamic";

const renumberSchema = z.object({
  startFrom: z.number().int().min(1).max(1000000).optional(),
  step: z.number().int().min(1).max(1000000).optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const ents = await getEntitlements(session.user.id, session.user.role);
    if (!ents.features.shuffle) {
      return upgradeRequired("renumber", "La renumeración de pasajes requiere un plan Pro");
    }

    const { projectId } = await params;
    const body = await req.json().catch(() => ({}));
    const parsed = parseOr400(renumberSchema, body);
    if (!parsed.ok) return parsed.response;
    const { startFrom = 1, step = 1 } = parsed.data;

    const project = await db.project.findFirst({
      where: { id: projectId, userId: session.user.id },
    });

    if (!project) {
      return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
    }

    const passages = await db.passage.findMany({
      where: { projectId },
      orderBy: { number: "asc" },
    });

    if (passages.length === 0) {
      return NextResponse.json({ message: "No hay pasajes para renumerar" });
    }

    // Build old→new mapping
    const numberMapping = new Map<number, number>();
    passages.forEach((passage, index) => {
      numberMapping.set(passage.number, startFrom + index * step);
    });

    // Renumber
    const updates = passages.map((passage, index) => {
      return db.passage.update({
        where: { id: passage.id },
        data: { number: startFrom + index * step },
      });
    });
    await db.$transaction(updates);

    // Update content references
    const allPassages = await db.passage.findMany({ where: { projectId } });
    const contentUpdates: ReturnType<typeof db.passage.update>[] = [];
    for (const p of allPassages) {
      const newContent = replaceNumberReferences(p.content, numberMapping);
      if (newContent !== p.content) {
        contentUpdates.push(
          db.passage.update({ where: { id: p.id }, data: { content: newContent } })
        );
      }
    }
    if (contentUpdates.length > 0) {
      for (const update of contentUpdates) {
        await update;
      }
    }

    const linkTextUpdates = await rewriteProjectLinkTexts(projectId, numberMapping);

    return NextResponse.json({
      message: `Pasajes renumerados: ${passages.length} pasajes (${startFrom} a ${startFrom + (passages.length - 1) * step})`,
      count: passages.length,
      from: startFrom,
      to: startFrom + (passages.length - 1) * step,
      contentUpdates: contentUpdates.length,
      linkTextUpdates,
    });
  } catch (error) {
    console.error("Renumber error:", error);
    return NextResponse.json({ error: "Error al renumerar" }, { status: 500 });
  }
}
