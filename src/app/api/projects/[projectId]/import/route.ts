import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { getEntitlements, upgradeRequired } from "@/lib/entitlements";
import { replaceProjectPassages } from "@/lib/passages-replace";
import { z } from "zod";

export const dynamic = "force-dynamic";

const ImportSchema = z.object({
  format: z.enum(["json", "md"]),
  content: z.string(),
  label: z.string().default("Importación"),
});

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
      return upgradeRequired("shuffle", "La importación requiere un plan Pro");
    }

    const project = await db.project.findFirst({
      where: { id: projectId, userId: session.user.id },
    });
    if (!project) {
      return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = ImportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.issues.map((i) => i.message) },
        { status: 400 }
      );
    }

    const { format, content, label } = parsed.data;

    // Parse input depending on format
    let segments: { title?: string | null; content: string }[];
    let links: { fromIndex: number; toIndex: number; text?: string }[];

    if (format === "json") {
      const data = z
        .object({
          segments: z
            .array(
              z.object({
                title: z.string().nullish(),
                content: z.string().min(1),
              })
            )
            .optional(),
          links: z
            .array(
              z.object({
                fromIndex: z.number().int(),
                toIndex: z.number().int(),
                text: z.string().optional(),
              })
            )
            .optional(),
        })
        .parse(content);
      segments = data.segments ?? [];
      links = data.links ?? [];
    } else {
      // Markdown: each passage is "TITLE\nCONTENT", separated by blank lines
      // Links are specified as "[[from-to]]" within passage text
      const passagesRaw = content.split(/\n\n/).filter((p) => p.trim().length > 0);
      segments = passagesRaw.map((p) => {
        const [titleLine, ...contentLines] = p.split("\n");
        const title = titleLine?.startsWith("# ") ? titleLine.substring(2).trim() : null;
        const content = contentLines.join("\n").trim();
        return { title, content };
      });

      // Extract links: [[from-to]] patterns
      const allLinks: { fromIndex: number; toIndex: number; text?: string }[] = [];
      const linkRegex = /\[\[(\d+)-(\d+)\]\]/g;
      let match: RegExpMatchArray | null;
      const foundLinks: string[] = [];
      for (const passage of passagesRaw) {
        const passageMatches = passage.match(linkRegex);
        if (passageMatches) foundLinks.push(...passageMatches);
      }
      // Build unique links
      const seen = new Set<string>();
      for (const l of foundLinks) {
        if (!seen.has(l)) {
          seen.add(l);
          const parts = l.match(/\[\[(\d+)-(\d+)\]\]/);
          if (parts) {
            allLinks.push({
              fromIndex: parseInt(parts[1]) - 1, // convert to 0-based
              toIndex: parseInt(parts[2]) - 1,
              text: "",
            });
          }
        }
      }
      // Filter links to valid range
      const passageCount = passagesRaw.length;
      links = allLinks.filter((l) => l.toIndex >= 0 && l.toIndex < passageCount);
    }

    // Create snapshot before import (for undo history)
    await db.shuffleSnapshot.create({
      data: {
        projectId,
        label,
        passageData: {},
      },
      // Keep only the last 5 snapshots
    });

    // Use existing replace logic
    const result = await replaceProjectPassages(projectId, segments, links, label);

    return NextResponse.json({
      message: "Importación completada",
      passageCount: result.passageCount,
      linksCreated: result.linksCreated,
      snapshotId: result.snapshotId,
    });
  } catch (error) {
    console.error("Error importing project:", error);
    return NextResponse.json({ error: "Error al importar el proyecto" }, { status: 500 });
  }
}