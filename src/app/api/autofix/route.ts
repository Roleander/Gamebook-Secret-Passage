import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { getEntitlements, upgradeRequired } from "@/lib/entitlements";
import { detectLinksInPassage } from "@/lib/parsers/txt";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const ents = await getEntitlements(
      (session.user as any).id,
      (session.user as any).role
    );
    if (!ents.features.autofix) {
      return upgradeRequired("autofix", "El auto-fix avanzado requiere un plan Pro");
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
    const passageNumbers = project.passages.map(p => p.number);

    for (const passage of project.passages) {
      const detectedLinks = detectLinksInPassage(passage.content, passageNumbers);

      for (const link of detectedLinks) {
        const targetPassage = project.passages.find(p => p.number === link.targetNumber);
        if (!targetPassage) continue;

        const existingLink = await db.passageLink.findUnique({
          where: {
            sourceId_targetId: {
              sourceId: passage.id,
              targetId: targetPassage.id,
            },
          },
        });

        if (!existingLink) {
          await db.passageLink.create({
            data: {
              sourceId: passage.id,
              targetId: targetPassage.id,
              linkText: link.text,
            },
          });
          linksCreated++;
        }
      }
    }

    // Refresh project data
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

    // 2. Fix orphan passages
    for (let i = 0; i < refreshedProject.passages.length; i++) {
      const passage = refreshedProject.passages[i];

      if (passage.incomingLinks.length === 0 && !passage.isStart && i > 0) {
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

    // 3. Mark endpoints — only passages with no outgoing links AND no content suggesting continuation
    for (const passage of refreshedProject.passages) {
      if (passage.outgoingLinks.length === 0 && !passage.isEndpoint) {
        // Check if content contains words that suggest it's NOT an ending
        const contentLower = (passage.content || "").toLowerCase();
        const looksLikeContinuation = /\b(ve(?:s|r)?\s+al|pas(?:a|ar)?\s+al|continuar|sigue\s+en|ir\s+al|dirigir)\b/i.test(contentLower);
        if (!looksLikeContinuation) {
          await db.passage.update({
            where: { id: passage.id },
            data: { isEndpoint: true },
          });
          endpointsMarked++;
        }
      }
    }

    // 4. Mark start
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
