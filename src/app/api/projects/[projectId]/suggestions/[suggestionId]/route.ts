import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const ActionSchema = z.object({
  action: z.enum(["accept", "reject"]),
});

export async function PATCH(
  req: Request,
  context: { params: Promise<{ projectId: string; suggestionId: string }> }
) {
  try {
    const { projectId, suggestionId } = await context.params;
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
    const parsed = ActionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    const suggestion = await db.suggestion.findFirst({
      where: { id: suggestionId, projectId },
    });
    if (!suggestion) {
      return NextResponse.json({ error: "Sugerencia no encontrada" }, { status: 404 });
    }

    if (parsed.data.action === "reject") {
      const updated = await db.suggestion.update({
        where: { id: suggestion.id },
        data: { status: "rejected" },
      });
      return NextResponse.json({ suggestion: updated });
    }

    const [source, target] = await Promise.all([
      db.passage.findUnique({
        where: {
          projectId_number: { projectId, number: suggestion.sourceNumber },
        },
        select: { id: true },
      }),
      db.passage.findUnique({
        where: {
          projectId_number: { projectId, number: suggestion.targetNumber },
        },
        select: { id: true },
      }),
    ]);

    if (!source || !target) {
      return NextResponse.json(
        { error: "Los pasajes de esta sugerencia ya no existen" },
        { status: 400 }
      );
    }

    const existingLink = await db.passageLink.findUnique({
      where: { sourceId_targetId: { sourceId: source.id, targetId: target.id } },
      select: { id: true },
    });

    if (!existingLink) {
      await db.passageLink.create({
        data: {
          sourceId: source.id,
          targetId: target.id,
          linkText: `Ve al pasaje ${suggestion.targetNumber}`,
        },
      });
    }

    const updated = await db.suggestion.update({
      where: { id: suggestion.id },
      data: { status: "accepted" },
    });

    return NextResponse.json({ suggestion: updated });
  } catch (error) {
    console.error("Error resolving suggestion:", error);
    return NextResponse.json({ error: "Error al procesar la sugerencia" }, { status: 500 });
  }
}
