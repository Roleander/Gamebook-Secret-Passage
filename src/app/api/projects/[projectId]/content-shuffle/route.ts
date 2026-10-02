import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { getEntitlements, upgradeRequired } from "@/lib/entitlements";
import { createProjectSnapshot } from "@/lib/snapshots";
import {
  buildContentShufflePlan,
  computeShuffleMutations,
} from "@/lib/content-shuffle";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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

    const { passageUpdates, newLinks } = computeShuffleMutations(
      project.passages,
      plan
    );

    await db.$transaction(
      async (tx) => {
        for (const update of passageUpdates) {
          await tx.passage.update({
            where: { id: update.id },
            data: {
              content: update.content,
              ...(update.title !== undefined ? { title: update.title } : {}),
              ...(update.isEndpoint !== undefined
                ? { isEndpoint: update.isEndpoint }
                : {}),
            },
          });
        }

        await tx.passageLink.deleteMany({
          where: { sourceId: { in: project.passages.map((p) => p.id) } },
        });

        if (newLinks.length > 0) {
          await tx.passageLink.createMany({
            data: newLinks.map((link) => ({
              sourceId: link.sourceId,
              targetId: link.targetId,
              linkText: link.linkText ?? null,
              condition: link.condition ?? null,
            })),
            skipDuplicates: true,
          });
        }
      },
      { maxWait: 10_000, timeout: 45_000 }
    );

    console.log(
      "Content shuffle OK:",
      projectId,
      project.passages.length,
      "passages,",
      newLinks.length,
      "links"
    );

    return NextResponse.json({
      message: "Contenido barajado entre pasajes (números mantenidos)",
      passageCount: project.passages.length,
      linksCreated: newLinks.length,
      startPreserved: plan.startStory !== null,
    });
  } catch (error) {
    console.error("Error in content shuffle:", error);
    return NextResponse.json({ error: "Error al barajar contenido" }, { status: 500 });
  }
}
