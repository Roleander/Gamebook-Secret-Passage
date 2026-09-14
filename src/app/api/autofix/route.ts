import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { autoDetectLinks } from "@/lib/parsers/txt";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { projectId } = await req.json();

    if (!projectId) {
      return NextResponse.json({ error: "projectId requerido" }, { status: 400 });
    }

    const project = await db.project.findFirst({
      where: {
        id: projectId,
        userId: (session.user as any).id,
      },
      include: {
        passages: {
          include: {
            outgoingLinks: true,
            incomingLinks: true,
          },
          orderBy: { number: "asc" },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
    }

    let linksCreated = 0;
    let endpointsMarked = 0;
    let startsMarked = 0;
    let orphansFixed = 0;

    // 1. Auto-detect links from passage content
    const passages = project.passages.map(p => ({
      number: p.number,
      content: p.content,
    }));

    const detectedLinks = autoDetectLinks(passages);

    for (const link of detectedLinks) {
      const sourcePassage = project.passages.find(p => p.number === link.sourceNumber);
      const targetPassage = project.passages.find(p => p.number === link.targetNumber);

      if (!sourcePassage || !targetPassage) continue;

      const existingLink = await db.passageLink.findUnique({
        where: {
          sourceId_targetId: {
            sourceId: sourcePassage.id,
            targetId: targetPassage.id,
          },
        },
      });

      if (!existingLink) {
        await db.passageLink.create({
          data: {
            sourceId: sourcePassage.id,
            targetId: targetPassage.id,
            linkText: link.text,
          },
        });
        linksCreated++;
      }
    }

    // Refresh project data after creating links
    const refreshedProject = await db.project.findFirst({
      where: { id: projectId },
      include: {
        passages: {
          include: {
            outgoingLinks: true,
            incomingLinks: true,
          },
          orderBy: { number: "asc" },
        },
      },
    });

    if (!refreshedProject) {
      return NextResponse.json({ error: "Error al refrescar proyecto" }, { status: 500 });
    }

    // 2. Fix orphan passages by linking from the previous passage
    for (let i = 0; i < refreshedProject.passages.length; i++) {
      const passage = refreshedProject.passages[i];

      if (passage.incomingLinks.length === 0 && !passage.isStart && i > 0) {
        // This is an orphan - link from the previous passage
        const previousPassage = refreshedProject.passages[i - 1];

        const existingLink = await db.passageLink.findUnique({
          where: {
            sourceId_targetId: {
              sourceId: previousPassage.id,
              targetId: passage.id,
            },
          },
        });

        if (!existingLink) {
          await db.passageLink.create({
            data: {
              sourceId: previousPassage.id,
              targetId: passage.id,
              linkText: `Continuar al pasaje ${passage.number}`,
            },
          });
          orphansFixed++;
          linksCreated++;
        }
      }
    }

    // 3. Mark passages without outgoing links as endpoints
    for (const passage of refreshedProject.passages) {
      if (passage.outgoingLinks.length === 0 && !passage.isEndpoint) {
        await db.passage.update({
          where: { id: passage.id },
          data: { isEndpoint: true },
        });
        endpointsMarked++;
      }
    }

    // 4. Mark passage with number 1 as start
    for (const passage of refreshedProject.passages) {
      if (passage.number === 1 && !passage.isStart) {
        await db.passage.update({
          where: { id: passage.id },
          data: { isStart: true },
        });
        startsMarked++;
      }
    }

    return NextResponse.json({
      linksCreated,
      endpointsMarked,
      startsMarked,
      orphansFixed,
    });
  } catch (error) {
    console.error("Error auto-fixing:", error);
    return NextResponse.json(
      { error: "Error al auto-fixear" },
      { status: 500 }
    );
  }
}
