import { db } from "@/lib/db";

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

export async function generateTXT(projectId: string, readingMode = false): Promise<string> {
  const project = await db.project.findUnique({
    where: { id: projectId },
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
    throw new Error("Proyecto no encontrado");
  }

  const passageNumbers = new Set(project.passages.map(p => p.number));
  const linkMap = new Map<number, { targetNumber: number; text: string }[]>();
  for (const p of project.passages) {
    if (p.outgoingLinks.length > 0) {
      linkMap.set(p.number, p.outgoingLinks.map(l => ({
        targetNumber: l.target.number,
        text: l.linkText || `Pasaje ${l.target.number}`,
      })));
    }
  }

  function linkifyContent(content: string, passageNumber: number): string {
    const links = linkMap.get(passageNumber);
    if (!links || links.length === 0) return content;

    const regex = /\b(\d+(?:[.,]\d+)?)\b/g;
    let result = "";
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(content)) !== null) {
      const numStr = match[1].replace(",", ".");
      const num = parseFloat(numStr);
      if (passageNumbers.has(num) && num !== passageNumber) {
        result += content.slice(lastIndex, match.index);
        result += `${match[0]} → pasaje ${num}`;
        lastIndex = match.index + match[0].length;
      }
    }
    result += content.slice(lastIndex);
    return result;
  }

  let txt = `${project.title}\n`;
  txt += `${"=".repeat(project.title.length)}\n\n`;

  project.passages.forEach((passage) => {
    if (readingMode) {
      const markers = [];
      if (passage.number === 1) markers.push("[INICIO]");
      if (passage.isEndpoint) markers.push("[FIN]");
      const markerStr = markers.length > 0 ? ` ${markers.join(" ")}` : "";

      txt += `Pasaje ${passage.number}${markerStr}\n\n`;
      txt += `${linkifyContent(passage.content, passage.number)}\n\n`;
    } else {
      txt += `\n--- PASAJE ${passage.number}`;
      if (passage.title) txt += ` — ${passage.title}`;
      if (passage.number === 1) txt += " [INICIO]";
      if (passage.isEndpoint) txt += " [FIN]";
      txt += ` ---\n\n`;
      txt += `${linkifyContent(passage.content, passage.number)}\n\n`;
      if (passage.outgoingLinks.length > 0) {
        txt += `Opciones:\n`;
        passage.outgoingLinks.forEach((link) => {
          const text = link.linkText || `Continuar al pasaje ${link.target.number}`;
          txt += `  → ${text}\n`;
        });
        txt += `\n`;
      }
    }
  });

  return txt;
}
