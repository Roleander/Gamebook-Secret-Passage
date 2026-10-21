import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { getEntitlements, upgradeRequired } from "@/lib/entitlements";
import { generatePDF } from "@/lib/exporters/pdf";
import { generateTXT } from "@/lib/exporters/txt";
import { generateODT } from "@/lib/exporters/odt";
import { generateDOC } from "@/lib/exporters/doc";
import { generateDOCX } from "@/lib/exporters/docx";
import { generateEPUB } from "@/lib/exporters/epub";
import { htmlToPdf } from "@/lib/print-to-pdf";
import { getPdfExportUsage, recordPdfExport } from "@/lib/pdf-quota";
import { z } from "zod";
import { parseOr400 } from "@/lib/api-validate";
import { THEME_IDS, type ThemeId } from "@/lib/exporters/themes";

export const maxDuration = 60;

const exportSchema = z.object({
  projectId: z
    .string({ error: "projectId y format son requeridos" })
    .min(1, { error: "projectId y format son requeridos" })
    .max(100),
  format: z
    .string({ error: "projectId y format son requeridos" })
    .min(1, { error: "projectId y format son requeridos" })
    .max(16),
  readingMode: z.boolean().optional(),
  theme: z.enum(THEME_IDS as [ThemeId, ...ThemeId[]]).optional(),
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const parsed = parseOr400(exportSchema, await req.json().catch(() => null));
    if (!parsed.ok) return parsed.response;
    const { projectId, format, readingMode, theme } = parsed.data;

    if (format !== "txt") {
      const ents = await getEntitlements(
        (session.user as any).id,
        (session.user as any).role
      );
      if (!ents.features.exportAdvanced) {
        return upgradeRequired(
          "export",
          "La exportación a PDF, EPUB, ODT, DOC y DOCX requiere un plan Pro"
        );
      }
    }

    const project = await db.project.findFirst({
      where: {
        id: projectId,
        userId: (session.user as any).id,
      },
      include: {
        passages: {
          include: {
            outgoingLinks: {
              include: {
                target: { select: { number: true } },
              },
            },
          },
          orderBy: { number: "asc" },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
    }

    const safeTitle = project.title.replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ\s-]/g, "").trim();

    switch (format) {
      case "pdf": {
        const html = await generatePDF(projectId, readingMode, theme ?? "clasico");
        const quota = await getPdfExportUsage();
        if (!quota.allowed) {
          return NextResponse.json(
            {
              error: `Cuota de exportación PDF alcanzada (${quota.used}/${quota.limit} en 30 días).`,
            },
            { status: 429 }
          );
        }
        try {
          const pdf = await htmlToPdf(html);
          await recordPdfExport();
          return new NextResponse(new Uint8Array(pdf), {
            headers: {
              "Content-Type": "application/pdf",
              "Content-Disposition": `attachment; filename="${safeTitle}.pdf"`,
            },
          });
        } catch (renderError) {
          console.error(
            "[pdf-export] fallo al generar PDF:",
            renderError instanceof Error ? renderError.message : renderError
          );
          return NextResponse.json(
            { error: "No se pudo generar el PDF. Inténtalo de nuevo." },
            { status: 500 }
          );
        }
      }
      case "epub": {
        const epubBuffer = await generateEPUB(project, readingMode ?? false, theme ?? "clasico");
        return new NextResponse(new Uint8Array(epubBuffer), {
          headers: {
            "Content-Type": "application/epub+zip",
            "Content-Disposition": `attachment; filename="${safeTitle}.epub"`,
          },
        });
      }
      case "txt": {
        const txt = await generateTXT(projectId, readingMode);
        return new NextResponse(txt, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Content-Disposition": `attachment; filename="${safeTitle}.txt"`,
          },
        });
      }
      case "odt": {
        const odtBuffer = await generateODT(projectId, readingMode, theme ?? "clasico");
        return new NextResponse(new Uint8Array(odtBuffer), {
          headers: {
            "Content-Type": "application/vnd.oasis.opendocument.text",
            "Content-Disposition": `attachment; filename="${safeTitle}.odt"`,
          },
        });
      }
      case "doc": {
        const docContent = await generateDOC(projectId, readingMode, theme ?? "clasico");
        return new NextResponse(docContent, {
          headers: {
            "Content-Type": "application/msword; charset=utf-8",
            "Content-Disposition": `attachment; filename="${safeTitle}.doc"`,
          },
        });
      }
      case "docx": {
        const docxBuffer = await generateDOCX(projectId, readingMode, theme ?? "clasico");
        return new NextResponse(new Uint8Array(docxBuffer), {
          headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "Content-Disposition": `attachment; filename="${safeTitle}.docx"`,
          },
        });
      }
      default:
        return NextResponse.json(
          { error: "Formato no soportado. Usa 'pdf', 'epub', 'txt', 'odt', 'doc' o 'docx'" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error exporting:", error);
    return NextResponse.json(
      { error: "Error al exportar el proyecto" },
      { status: 500 }
    );
  }
}

