import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { getEntitlements, limitReached } from "@/lib/entitlements";

export const dynamic = "force-dynamic";

function duplicateTitle(title: string): string {
  const prefix = "Copia de ";
  const maxLength = 300;
  const candidate = `${prefix}${title}`;
  return candidate.length <= maxLength
    ? candidate
    : `${candidate.slice(0, maxLength - 1).trimEnd()}…`;
}

export async function POST(
  _req: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await context.params;
    const session = await getServerSession(authOptions);
    const user = session?.user as { id?: string; role?: string } | undefined;

    if (!user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const project = await db.project.findFirst({
      where: { id: projectId, userId: user.id },
      include: {
        passages: {
          include: {
            outgoingLinks: {
              select: { targetId: true, linkText: true, condition: true },
            },
          },
          orderBy: { number: "asc" },
        },
        imports: {
          orderBy: { importedAt: "desc" },
          take: 1,
        },
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Proyecto no encontrado" },
        { status: 404 }
      );
    }

    const entitlements = await getEntitlements(user.id, user.role);

    if (entitlements.maxProjects !== null) {
      const projectCount = await db.project.count({ where: { userId: user.id } });
      if (projectCount >= entitlements.maxProjects) {
        return limitReached(
          `Has alcanzado el límite de ${entitlements.maxProjects} proyectos de tu plan. Mejora a Pro para duplicar proyectos.`
        );
      }
    }

    if (
      entitlements.maxPassages !== null &&
      project.passages.length > entitlements.maxPassages
    ) {
      return limitReached(
        `El proyecto tiene ${project.passages.length} pasajes y tu plan permite ${entitlements.maxPassages}. Mejora a Pro para duplicarlo completo.`
      );
    }

    const duplicate = await db.$transaction(
      async (tx) => {
        const copy = await tx.project.create({
          data: {
            title: duplicateTitle(project.title),
            description: project.description,
            userId: user.id!,
          },
        });

        const latestImport = project.imports[0];
        if (latestImport) {
          await tx.importHistory.create({
            data: {
              projectId: copy.id,
              filename: latestImport.filename,
              fileType: latestImport.fileType,
              passagesCount: latestImport.passagesCount,
              rawContent: latestImport.rawContent,
            },
          });
        }

        const idMap = new Map<string, string>();
        for (const passage of project.passages) {
          idMap.set(passage.id, randomUUID());
        }

        if (project.passages.length > 0) {
          await tx.passage.createMany({
            data: project.passages.map((passage) => ({
              id: idMap.get(passage.id)!,
              projectId: copy.id,
              number: passage.number,
              title: passage.title,
              content: passage.content,
              sortOrder: passage.sortOrder,
              isStart: passage.isStart,
              isEndpoint: passage.isEndpoint,
              illustration: passage.illustration,
              illustrationAlt: passage.illustrationAlt,
            })),
          });

          const links = project.passages.flatMap((passage) => {
            const sourceId = idMap.get(passage.id);
            if (!sourceId) return [];
            return passage.outgoingLinks.flatMap((link) => {
              const targetId = idMap.get(link.targetId);
              if (!targetId) return [];
              return [
                {
                  id: randomUUID(),
                  sourceId,
                  targetId,
                  linkText: link.linkText,
                  condition: link.condition,
                },
              ];
            });
          });

          if (links.length > 0) {
            await tx.passageLink.createMany({
              data: links,
              skipDuplicates: true,
            });
          }
        }

        return copy;
      },
      { timeout: 30000, maxWait: 10000 }
    );

    return NextResponse.json(
      {
        id: duplicate.id,
        title: duplicate.title,
        description: duplicate.description,
        passageCount: project.passages.length,
      },
      { status: 201, headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    console.error("Error duplicating project:", error);
    return NextResponse.json(
      { error: "Error al duplicar el proyecto" },
      { status: 500 }
    );
  }
}
