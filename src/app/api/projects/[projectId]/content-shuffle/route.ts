import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { getEntitlements, upgradeRequired } from "@/lib/entitlements";
import { createProjectSnapshot } from "@/lib/snapshots";
import {
  buildContentShufflePlan,
  rewriteShuffledContent,
} from "@/lib/content-shuffle";

export const dynamic = "force-dynamic";

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

    const ents = await getEntitlements(session.user.id, session.user.role);
    if (!ents.features.shuffle) {
      return upgradeRequired("shuffle", "Barajar contenido requiere un plan Pro");
    }

    const body = await req.json().catch(() => ({}));
    const preserveStart = body.preserveStart !== false; // default true

    const project = await db.project.findFirst({
      where: { id: projectId, userId: session.user.id },
      include: {
        passages: {
          include: {
            outgoingLinks: true,
          },
          orderBy: { number: "asc" },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
    }

    if (project.passages.length < 2) {
      return NextResponse.json({ error: "Se necesitan al menos 2 pasajes" }, { status: 400 });
    }

    const plan = buildContentShufflePlan(
      project.passages.map((p) => ({ number: p.number, isStart: p.isStart })),
      { preserveStart }
    );

    const poolCount =
      project.passages.length - (plan.startStory !== null ? 1 : 0);
    if (poolCount < 2) {
      return NextResponse.json({ error: "No hay suficientes pasajes para barajar" }, { status: 400 });
    }

    // === SNAPSHOT: save current state before shuffle (for undo) ===
    await createProjectSnapshot(projectId, "Barajar Contenido");

    const byNumber = new Map(project.passages.map((p) => [p.number, p]));
    const byId = new Map(project.passages.map((p) => [p.id, p]));

    let linksCreated = 0;

    await db.$transaction(async (tx) => {
      // === Move each story into its slot, rewriting inline references ===
      for (const slot of project.passages) {
        const storyNumber = plan.slotToStory.get(slot.number);
        if (storyNumber === undefined) continue;
        const story = byNumber.get(storyNumber);
        if (!story) continue;

        const newContent = rewriteShuffledContent(story.content, plan);

        if (storyNumber === slot.number) {
          if (newContent !== story.content) {
            await tx.passage.update({
              where: { id: slot.id },
              data: { content: newContent },
            });
          }
        } else {
          await tx.passage.update({
            where: { id: slot.id },
            data: {
              content: newContent,
              title: story.title,
              isEndpoint: story.isEndpoint,
            },
          });
        }
      }

      // === Rebuild links so they follow their stories ===
      await tx.passageLink.deleteMany({
        where: { sourceId: { in: project.passages.map((p) => p.id) } },
      });

      for (const story of project.passages) {
        const sourceSlotNumber = plan.storyToSlot.get(story.number);
        if (sourceSlotNumber === undefined) continue;
        const sourceSlot = byNumber.get(sourceSlotNumber);
        if (!sourceSlot) continue;

        for (const link of story.outgoingLinks) {
          const targetStory = byId.get(link.targetId);
          if (!targetStory) continue;

          const targetSlotNumber = plan.storyToSlot.get(targetStory.number);
          if (targetSlotNumber === undefined) continue;
          const targetSlot = byNumber.get(targetSlotNumber);
          if (!targetSlot) continue;

          if (sourceSlot.id === targetSlot.id) continue;

          await tx.passageLink.create({
            data: {
              sourceId: sourceSlot.id,
              targetId: targetSlot.id,
              linkText: link.linkText
                ? rewriteShuffledContent(link.linkText, plan)
                : link.linkText,
              condition: link.condition,
            },
          });
          linksCreated++;
        }
      }
    });

    return NextResponse.json({
      message: "Contenido barajado entre pasajes (números mantenidos)",
      passageCount: project.passages.length,
      linksCreated,
      startPreserved: plan.startStory !== null,
    });
  } catch (error) {
    console.error("Error in content shuffle:", error);
    return NextResponse.json({ error: "Error al barajar contenido" }, { status: 500 });
  }
}
