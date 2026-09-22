import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

function updateAllNumberReferences(content: string, mapping: Map<number, number>): string {
  const tempPrefix = "§REF§";
  const tempSuffix = "§/REF§";
  let result = content;
  for (const [oldNum, newNum] of mapping) {
    const regex = new RegExp(`\\b${oldNum}\\b`, "g");
    result = result.replace(regex, `${tempPrefix}${newNum}${tempSuffix}`);
  }
  const tempRegex = new RegExp(`${tempPrefix}(\\d+)${tempSuffix}`, "g");
  result = result.replace(tempRegex, "$1");
  return result;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { projectId } = await params;
    const body = await req.json().catch(() => ({}));
    const { startFrom = 1, step = 1 } = body;

    const project = await db.project.findFirst({
      where: { id: projectId, userId: (session.user as any).id },
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
    const contentUpdates: Promise<any>[] = [];
    for (const p of allPassages) {
      const newContent = updateAllNumberReferences(p.content, numberMapping);
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

    return NextResponse.json({
      message: `Pasajes renumerados: ${passages.length} pasajes (${startFrom} a ${startFrom + (passages.length - 1) * step})`,
      count: passages.length,
      from: startFrom,
      to: startFrom + (passages.length - 1) * step,
      contentUpdates: contentUpdates.length,
    });
  } catch (error) {
    console.error("Renumber error:", error);
    return NextResponse.json({ error: "Error al renumerar" }, { status: 500 });
  }
}
