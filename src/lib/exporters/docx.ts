import { db } from "@/lib/db";
import { exportableLinks, exportableTargets, findPassageLinksPerLine, type PassageLink } from "@/lib/reference-links";
import { fetchIllustrations } from "@/lib/illustration";
import {
  Document, Packer, Paragraph, TextRun, BookmarkStart, BookmarkEnd, InternalHyperlink, ImageRun,
  AlignmentType, TabStopType, TabStopPosition,
  BorderStyle, ShadingType, convertInchesToTwip, CharacterSet,
} from "docx";
import { PDF_THEMES, officeTheme, type OfficeTheme, type ThemeId } from "@/lib/exporters/themes";
import { FONTS_TTF_DATA } from "@/lib/exporters/fonts-ttf-data";

interface Passage {
  id: string;
  number: number;
  title: string | null;
  content: string;
  isEndpoint: boolean;
  illustration?: string | null;
  illustrationAlt?: string | null;
  outgoingLinks: {
    targetId?: string | null;
    target: { number: number };
    linkText: string | null;
  }[];
}

export interface DocxProject {
  title: string;
  passages: Passage[];
}

export async function buildDocxBuffer(project: DocxProject, readingMode = false, theme: ThemeId = "clasico", showPassageMarkers = true): Promise<Buffer> {
  const passageNumbers = new Set(project.passages.map(p => p.number));
  const passageIds = new Set(project.passages.map(p => p.id));
  const th = officeTheme(PDF_THEMES[theme] ?? PDF_THEMES.clasico);
  const bodyFont = th.fontFamilies[0] || "Times New Roman";
  const headingFont = th.fontFamilies[th.fontFamilies.length - 1] || "Times New Roman";
  const toHex6 = (c: string) => {
    const h = c.replace("#", "");
    return (h.length === 3 ? h.split("").map((x) => x + x).join("") : h).toUpperCase();
  };
  const accentHex = toHex6(th.accent);
  const linkHex = toHex6(th.linkInline);
  const textHex = toHex6(th.text);
  const subtitleHex = toHex6(th.subtitle);

  function linkifyContent(content: string, links: PassageLink[]): (TextRun | InternalHyperlink)[] {
    const runs: (TextRun | InternalHyperlink)[] = [];
    let lastIndex = 0;

    for (const link of links) {
      if (link.start > lastIndex) {
        runs.push(new TextRun({ text: content.slice(lastIndex, link.start), font: bodyFont, size: 24, color: textHex }));
      }
      runs.push(new InternalHyperlink({
        anchor: `passage${link.target}`,
        children: [new TextRun({
          text: link.text,
          font: bodyFont,
          size: 24,
          color: linkHex,
          underline: { type: "dotted" as any },
        })],
      }));
      lastIndex = link.end;
    }
    if (lastIndex < content.length) {
      runs.push(new TextRun({ text: content.slice(lastIndex), font: bodyFont, size: 24, color: textHex }));
    }
    return runs.length > 0 ? runs : [new TextRun({ text: content, font: bodyFont, size: 24, color: textHex })];
  }

  const children: Paragraph[] = [];

  const illustrations = await fetchIllustrations(project.passages);
  const docxImages = new Map<
    number,
    { data: Buffer; type: "jpg" | "png"; width: number; height: number; alt: string }
  >();
  for (const [number, image] of illustrations) {
    const type = image.mime === "image/jpeg" ? "jpg" : image.mime === "image/png" ? "png" : null;
    if (!type) continue;
    const alt = project.passages.find((p) => p.number === number)?.illustrationAlt?.trim() || "";
    docxImages.set(number, {
      data: image.data,
      type,
      width: image.width,
      height: image.height,
      alt,
    });
  }

  const addIllustration = (passage: Passage) => {
    const image = docxImages.get(passage.number);
    if (!image) return;
    const maxWidth = 460;
    const maxHeight = 360;
    const scale = Math.min(maxWidth / image.width, maxHeight / image.height, 1);
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const alt = image.alt || `Ilustración del pasaje ${passage.number}`;
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [new ImageRun({
        type: image.type,
        data: image.data,
        transformation: { width, height },
        altText: { name: alt, description: image.alt || undefined, title: image.alt || undefined },
      })],
    }));
  };

  // Title
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
    children: [new TextRun({
      text: project.title,
      font: headingFont,
      size: 48,
      bold: true,
      color: accentHex,
    })],
  }));

  // Subtitle
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 400 },
    children: [new TextRun({
      text: "Librojuego generado por Secret Passage",
      font: bodyFont,
      size: 22,
      italics: true,
      color: subtitleHex,
    })],
  }));

  // Passages
  project.passages.forEach((passage, idx) => {
    const markers: string[] = [];
    if (showPassageMarkers && passage.number === 1) markers.push("[INICIO]");
    if (showPassageMarkers && passage.isEndpoint) markers.push("[FIN]");
    const markerStr = markers.length > 0 ? ` ${markers.join(" ")}` : "";

    const forcedTargets = exportableTargets(
      passage.outgoingLinks,
      passageIds,
      passage.number
    );
    const options = exportableLinks(passage.outgoingLinks, passageIds, passage.number);
    const lineLinks = findPassageLinksPerLine(
      passage.content,
      passageNumbers,
      passage.number,
      forcedTargets
    );
    const bookmarkId = idx + 1;

    if (readingMode) {
      // Passage number centered as bookmark
      children.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 300, after: 100 },
        children: [
          new BookmarkStart(`passage${passage.number}`, bookmarkId),
          new TextRun({
            text: `${passage.number}${markerStr}`,
            font: headingFont,
            size: 24,
            bold: true,
            color: accentHex,
          }),
          new BookmarkEnd(bookmarkId),
        ],
      }));
      addIllustration(passage);
      // Content
      const lines = passage.content.split("\n");
      lines.forEach((line, i) => {
        children.push(new Paragraph({
          spacing: { after: 100 },
          children: linkifyContent(line, lineLinks[i]),
        }));
      });
    } else {
      // Passage header as bookmark
      let header = `Pasaje ${passage.number}`;
      if (passage.title) header += ` — ${passage.title}`;
      children.push(new Paragraph({
        spacing: { before: 300, after: 100 },
        children: [
          new BookmarkStart(`passage${passage.number}`, bookmarkId),
          new TextRun({
            text: `${header}${markerStr}`,
            font: headingFont,
            size: 28,
            bold: true,
            color: accentHex,
          }),
          new BookmarkEnd(bookmarkId),
        ],
      }));
      addIllustration(passage);
      // Content
      const lines = passage.content.split("\n");
      lines.forEach((line, i) => {
        children.push(new Paragraph({
          spacing: { after: 100 },
          children: linkifyContent(line, lineLinks[i]),
        }));
      });
      // Options
      if (options.length > 0) {
        children.push(new Paragraph({
          spacing: { before: 100 },
          children: [new TextRun({
            text: "Opciones:",
            font: headingFont,
            size: 22,
            bold: true,
            color: accentHex,
          })],
        }));
        options.forEach((link) => {
          const text = link.linkText || `Continuar al pasaje ${link.target.number}`;
          children.push(new Paragraph({
            spacing: { after: 50 },
            indent: { left: convertInchesToTwip(0.3) },
            children: [
              new TextRun({ text: "→ ", font: bodyFont, size: 22, color: textHex }),
              new InternalHyperlink({
                anchor: `passage${link.target.number}`,
                children: [new TextRun({
                  text,
                  font: bodyFont,
                  size: 22,
                  bold: true,
                  color: linkHex,
                })],
              }),
            ],
          }));
        });
      }
    }
    // Spacer
    children.push(new Paragraph({ spacing: { after: 200 }, children: [] }));
    if (th.id !== "clasico" && idx < project.passages.length - 1) {
      children.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 100, after: 100 },
        children: [new TextRun({ text: "❧", font: bodyFont, size: 24, color: accentHex })],
      }));
    }
  });

  // Embed theme fonts if not clasico
  const embeddedFonts =
    th.id === "clasico"
      ? undefined
      : FONTS_TTF_DATA.filter((f) => th.fontFamilies.includes(f.family)).map((f) => ({
          name: f.family,
          data: Buffer.from(f.base64, "base64"),
          characterSet: CharacterSet.ANSI,
        }));

  const doc = new Document({
    ...(embeddedFonts ? { fonts: embeddedFonts } : {}),
    styles: {
      default: {
        document: {
          run: {
            font: bodyFont,
            size: 24,
            color: textHex,
          },
        },
      },
    },
    sections: [{
      properties: {
        page: {
          margin: {
            top: convertInchesToTwip(1),
            bottom: convertInchesToTwip(1),
            left: convertInchesToTwip(1),
            right: convertInchesToTwip(1),
          },
        },
      },
      children,
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  return Buffer.from(buffer);
}

export async function generateDOCX(projectId: string, readingMode = false, theme: ThemeId = "clasico", showPassageMarkers = true): Promise<Buffer> {
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      passages: {
        include: {
          outgoingLinks: {
            include: { target: { select: { number: true } } },
          },
        },
        orderBy: { number: "asc" },
      },
    },
  });

  if (!project) throw new Error("Proyecto no encontrado");

  return buildDocxBuffer(
    { title: project.title, passages: project.passages },
    readingMode,
    theme,
    showPassageMarkers
  );
}
