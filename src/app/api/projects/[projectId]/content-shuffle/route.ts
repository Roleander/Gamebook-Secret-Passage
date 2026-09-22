import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { updateAllNumberReferences } from "@/lib/utils";

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

    const body = await req.json().catch(() => ({}));
    const preserveStart = body.preserveStart !== false; // default true

    const project = await db.project.findFirst({
      where: { id: projectId, userId: (session.user as any).id },
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

    // === SNAPSHOT: save current state before shuffle (for undo) ===
    const snapshotData: Record<string, any> = {};
    for (const p of project.passages) {
      snapshotData[p.id] = {
        content: p.content,
        title: p.title,
        isEndpoint: p.isEndpoint,
        isStart: p.isStart,
        links: p.outgoingLinks.map((l) => ({
          targetId: l.targetId,
          linkText: l.linkText,
          condition: l.condition,
        })),
      };
    }

    await db.shuffleSnapshot.create({
      data: {
        projectId,
        label: "Barajar Contenido",
        passageData: snapshotData as any,
      },
    });

    // Keep only the last 5 snapshots to avoid bloat
    const snapshots = await db.shuffleSnapshot.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    });
    if (snapshots.length > 5) {
      await db.shuffleSnapshot.deleteMany({
        where: { id: { in: snapshots.slice(5).map((s) => s.id) } },
      });
    }

    // === PHASE 2: Separate start passage from shuffle pool ===
    const startPassage = preserveStart
      ? project.passages.find((p) => p.isStart)
      : null;

    const passagesToShuffle = startPassage
      ? project.passages.filter((p) => p.id !== startPassage.id)
      : [...project.passages];

    if (passagesToShuffle.length < 2) {
      return NextResponse.json({ error: "No hay suficientes pasajes para barajar" }, { status: 400 });
    }

    // Fisher-Yates shuffle
    for (let i = passagesToShuffle.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [passagesToShuffle[i], passagesToShuffle[j]] = [passagesToShuffle[j], passagesToShuffle[i]];
    }

    // Build shuffled content array
    const shuffledContents = passagesToShuffle.map((p) => ({
      id: p.id,
      number: p.number,
      content: p.content,
      title: p.title,
      isEndpoint: p.isEndpoint,
      outgoingLinks: p.outgoingLinks.map((l) => ({
        targetId: l.targetId,
        linkText: l.linkText,
        condition: l.condition,
      })),
    }));

    // Assign shuffled content to passage slots
    // shuffledContents[i] gets the content from passagesToShuffle[i]
    // It gets placed into the passage slot of passagesToShuffle[i] (same number, same id)
    const numberToContent = new Map<number, (typeof shuffledContents)[0]>();
    for (let i = 0; i < passagesToShuffle.length; i++) {
      numberToContent.set(passagesToShuffle[i].number, shuffledContents[i]);
    }

    // Build inline reference mapping: oldNumber → newNumber for each passage
    // passage X had content C, content C referenced passage Y
    // After shuffle: content C is in passage slot Z
    // So inline references to Y should become references to wherever Y's content moved to
    const inlineMapping = new Map<number, number>();
    for (let i = 0; i < passagesToShuffle.length; i++) {
      // passagesToShuffle[i].number receives content from shuffledContents[i].number
      inlineMapping.set(shuffledContents[i].number, passagesToShuffle[i].number);
    }

    // === PHASE 1: Update content and inline text references ===
    for (const passage of project.passages) {
      if (startPassage && passage.id === startPassage.id) continue; // skip start passage

      const newData = numberToContent.get(passage.number);
      if (!newData) continue;

      // Update inline number references in the shuffled content
      const updatedContent = updateAllNumberReferences(newData.content, inlineMapping);

      await db.passage.update({
        where: { id: passage.id },
        data: {
          content: updatedContent,
          title: newData.title,
          isEndpoint: newData.isEndpoint,
        },
      });
    }

    // === Rebuild PassageLink records ===
    const passageIds = project.passages.map((p) => p.id);
    await db.passageLink.deleteMany({
      where: { sourceId: { in: passageIds } },
    });

    let linksCreated = 0;
    for (const passage of project.passages) {
      if (startPassage && passage.id === startPassage.id) continue;

      const newData = numberToContent.get(passage.number);
      if (!newData) continue;

      for (const link of newData.outgoingLinks) {
        // Find where the original target's content now lives
        const originalTarget = project.passages.find((p) => p.id === link.targetId);
        if (!originalTarget) continue;

        const newTargetNumber = inlineMapping.get(originalTarget.number);
        if (newTargetNumber === undefined) continue;

        const newTargetPassage = project.passages.find((p) => p.number === newTargetNumber);
        if (!newTargetPassage) continue;

        // Skip self-links
        if (passage.id === newTargetPassage.id) continue;

        // === PHASE 3: Update linkText to match new target number ===
        let updatedLinkText = link.linkText;
        if (updatedLinkText) {
          // Replace old target number with new target number in linkText
          updatedLinkText = updateAllNumberReferences(
            updatedLinkText,
            new Map([[originalTarget.number, newTargetNumber]])
          );
        }

        const existing = await db.passageLink.findUnique({
          where: {
            sourceId_targetId: {
              sourceId: passage.id,
              targetId: newTargetPassage.id,
            },
          },
        });

        if (!existing) {
          await db.passageLink.create({
            data: {
              sourceId: passage.id,
              targetId: newTargetPassage.id,
              linkText: updatedLinkText,
              condition: link.condition,
            },
          });
          linksCreated++;
        }
      }
    }

    return NextResponse.json({
      message: "Contenido barajado entre pasajes (números mantenidos)",
      passageCount: project.passages.length,
      linksCreated,
      startPreserved: !!startPassage,
    });
  } catch (error) {
    console.error("Error in content shuffle:", error);
    return NextResponse.json({ error: "Error al barajar contenido" }, { status: 500 });
  }
}
