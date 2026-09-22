import { db } from "@/lib/db";
import {
  Document, Packer, Paragraph, TextRun, Bookmark, InternalHyperlink,
  HeadingLevel, AlignmentType, TabStopType, TabStopPosition,
  BorderStyle, ShadingType, convertInchesToTwip,
} from "docx";

interface Passage {
  id: string;
  number: number;
  title: string | null;
  content: string;
  isEndpoint: boolean;
  outgoingLinks: {
    target: { number: number };
    linkText: string | null;
  }[];
}

export async function generateDOCX(projectId: string, readingMode = false): Promise<Buffer> {
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

  const passageNumbers = new Set(project.passages.map(p => p.number));

  function linkifyContent(content: string, passageNumber: number): (TextRun | InternalHyperlink)[] {
    const regex = /\b(\d+(?:[.,]\d+)?)\b/g;
    const runs: (TextRun | InternalHyperlink)[] = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(content)) !== null) {
      const numStr = match[1].replace(",", ".");
      const num = parseFloat(numStr);
      if (passageNumbers.has(num) && num !== passageNumber) {
        if (match.index > lastIndex) {
          runs.push(new TextRun({ text: content.slice(lastIndex, match.index), font: "Times New Roman", size: 24 }));
        }
        runs.push(new InternalHyperlink({
          anchor: `passage-${num}`,
          children: [new TextRun({
            text: match[0],
            font: "Times New Roman",
            size: 24,
            color: "8B4513",
            underline: { type: "dotted" as any },
          })],
        }));
        lastIndex = match.index + match[0].length;
      }
    }
    if (lastIndex < content.length) {
      runs.push(new TextRun({ text: content.slice(lastIndex), font: "Times New Roman", size: 24 }));
    }
    return runs.length > 0 ? runs : [new TextRun({ text: content, font: "Times New Roman", size: 24 })];
  }

  const children: Paragraph[] = [];

  // Title
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
    children: [new TextRun({
      text: project.title,
      font: "Times New Roman",
      size: 48,
      bold: true,
      color: "8B4513",
    })],
  }));

  // Subtitle
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 400 },
    children: [new TextRun({
      text: "Librojuego generado por Secret Passage",
      font: "Times New Roman",
      size: 22,
      italics: true,
      color: "666666",
    })],
  }));

  // Passages
  project.passages.forEach((passage) => {
    const markers: string[] = [];
    if (passage.number === 1) markers.push("[INICIO]");
    if (passage.isEndpoint) markers.push("[FIN]");
    const markerStr = markers.length > 0 ? ` ${markers.join(" ")}` : "";

    if (readingMode) {
      // Passage number centered as bookmark
      children.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 300, after: 100 },
        children: [new Bookmark({
          id: `passage-${passage.number}`,
          children: [new TextRun({
            text: `${passage.number}${markerStr}`,
            font: "Times New Roman",
            size: 24,
            bold: true,
            color: "8B4513",
          })],
        })],
      }));
      // Content
      const lines = passage.content.split("\n");
      lines.forEach((line) => {
        children.push(new Paragraph({
          spacing: { after: 100 },
          children: linkifyContent(line, passage.number),
        }));
      });
    } else {
      // Passage header as bookmark
      let header = `Pasaje ${passage.number}`;
      if (passage.title) header += ` — ${passage.title}`;
      children.push(new Paragraph({
        spacing: { before: 300, after: 100 },
        children: [new Bookmark({
          id: `passage-${passage.number}`,
          children: [new TextRun({
            text: `${header}${markerStr}`,
            font: "Times New Roman",
            size: 28,
            bold: true,
            color: "8B4513",
          })],
        })],
      }));
      // Content
      const lines = passage.content.split("\n");
      lines.forEach((line) => {
        children.push(new Paragraph({
          spacing: { after: 100 },
          children: linkifyContent(line, passage.number),
        }));
      });
      // Options
      if (passage.outgoingLinks.length > 0) {
        children.push(new Paragraph({
          spacing: { before: 100 },
          children: [new TextRun({
            text: "Opciones:",
            font: "Times New Roman",
            size: 22,
            bold: true,
            color: "8B4513",
          })],
        }));
        passage.outgoingLinks.forEach((link) => {
          const text = link.linkText || `Continuar al pasaje ${link.target.number}`;
          children.push(new Paragraph({
            spacing: { after: 50 },
            indent: { left: convertInchesToTwip(0.3) },
            children: [
              new TextRun({ text: "→ ", font: "Times New Roman", size: 22 }),
              new InternalHyperlink({
                anchor: `passage-${link.target.number}`,
                children: [new TextRun({
                  text,
                  font: "Times New Roman",
                  size: 22,
                  bold: true,
                  color: "8B4513",
                })],
              }),
            ],
          }));
        });
      }
    }
    // Spacer
    children.push(new Paragraph({ spacing: { after: 200 }, children: [] }));
  });

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: "Times New Roman",
            size: 24,
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
