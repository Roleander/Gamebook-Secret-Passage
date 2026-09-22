import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

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

    const snapshot = await db.shuffleSnapshot.findFirst({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      select: { id: true, label: true, createdAt: true },
    });

    return NextResponse.json({
      hasSnapshot: !!snapshot,
      snapshot: snapshot || null,
    });
  } catch (error) {
    return NextResponse.json({ hasSnapshot: false });
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
      where: { id: projectId, userId: (session.user as any).id },
      include: {
        passages: true,
        snapshots: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
    }

    if (project.snapshots.length === 0) {
      return NextResponse.json({ error: "No hay respaldo para deshacer" }, { status: 400 });
    }

    const snapshot = project.snapshots[0];
    const snapshotData = snapshot.passageData as Record<string, any>;

    // Restore passage content and metadata
    for (const passage of project.passages) {
      const saved = snapshotData[passage.id];
      if (!saved) continue;

      await db.passage.update({
        where: { id: passage.id },
        data: {
          content: saved.content,
          title: saved.title,
          isEndpoint: saved.isEndpoint,
          isStart: saved.isStart,
        },
      });
    }

    // Restore PassageLink records
    const passageIds = project.passages.map((p) => p.id);
    await db.passageLink.deleteMany({
      where: { sourceId: { in: passageIds } },
    });

    let linksRestored = 0;
    for (const passage of project.passages) {
      const saved = snapshotData[passage.id];
      if (!saved?.links) continue;

      for (const link of saved.links) {
        // Verify target still exists
        const targetExists = project.passages.some((p) => p.id === link.targetId);
        if (!targetExists) continue;
        if (passage.id === link.targetId) continue; // skip self-links

        const existing = await db.passageLink.findUnique({
          where: {
            sourceId_targetId: {
              sourceId: passage.id,
              targetId: link.targetId,
            },
          },
        });

        if (!existing) {
          await db.passageLink.create({
            data: {
              sourceId: passage.id,
              targetId: link.targetId,
              linkText: link.linkText,
              condition: link.condition,
            },
          });
          linksRestored++;
        }
      }
    }

    // Delete the snapshot we just restored
    await db.shuffleSnapshot.delete({ where: { id: snapshot.id } });

    return NextResponse.json({
      message: "Deshacer completado",
      passageCount: project.passages.length,
      linksRestored,
    });
  } catch (error) {
    console.error("Error undoing shuffle:", error);
    return NextResponse.json({ error: "Error al deshacer" }, { status: 500 });
  }
}
