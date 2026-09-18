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

export async function generateDOC(projectId: string, readingMode = false): Promise<string> {
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

  // RTF helper: escape special RTF characters
  function rtfEscape(text: string): string {
    return text
      .replace(/\\/g, "\\\\")
      .replace(/\{/g, "\\{")
      .replace(/\}/g, "\\}")
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
  }

  function rtfEncode(text: string): string {
    let result = "";
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      if (code > 127) {
        result += `\\u${code >= 32768 ? code - 65536 : code}?`;
      } else {
        result += text[i];
      }
    }
    return result;
  }

  function linkifyRtf(content: string, passageNumber: number): string {
    const regex = /\b(\d+(?:[.,]\d+)?)\b/g;
    let result = "";
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(content)) !== null) {
      const numStr = match[1].replace(",", ".");
      const num = parseFloat(numStr);
      if (passageNumbers.has(num) && num !== passageNumber) {
        result += rtfEncode(content.slice(lastIndex, match.index));
        // RTF hyperlink: {\field{\*\fldinst{HYPERLINK "#passage-N"}}{\fldrslt{TEXT}}}
        result += `{\\field{\\*\\fldinst{HYPERLINK "#passage${num}"}}{\\fldrslt{\\cf8\\b ${rtfEncode(match[0])}}}}`;
        lastIndex = match.index + match[0].length;
      }
    }
    result += rtfEncode(content.slice(lastIndex));
    return result;
  }

  // Build RTF document
  let rtf = `{\\rtf1\\ansi\\ansicpg1252\\deff0\\deflang1034`;
  rtf += `{\\fonttbl{\\f0\\froman\\fcharset0 Times New Roman;}}`;
  rtf += `{\\stylesheet{\\f0\\fs24\\cf8\\b Heading1;}{}{\\f0\\fs20\\cf8 PassageNumber;}{}{\\f0\\fs22 PassageContent;}{}{\\f0\\fs20\\cf8\\b Links;}{}{\\f0\\fs20\\cf2 StartMarker;}{}{\\f0\\fs20\\cf6 EndMarker;}}`;
  rtf += `\\paperw11900\\paperh16840\\margl1440\\margr1440\\margt1440\\margb1440`;
  rtf += `\\deftab720\\plateline`;

  // Title
  rtf += `{\\pard\\qc\\plain\\f0\\fs40\\cf8\\b ${rtfEncode(project.title)}\\par}`;
  rtf += `{\\pard\\qc\\plain\\f0\\fs20\\i Librojuego generado por Secret Passage\\par}`;
  rtf += `{\\pard\\plain\\fs20\\par}`;

  project.passages.forEach((passage) => {
    const markers = [];
    if (passage.number === 1) markers.push("\\cf2\\b [INICIO]\\b0");
    if (passage.isEndpoint) markers.push("\\cf6\\b [FIN]\\b0");
    const markerStr = markers.length > 0 ? ` ${markers.join(" ")}` : "";

    if (readingMode) {
      // Passage number centered
      rtf += `{\\pard\\qc\\plain\\f0\\fs24\\cf8\\b ${passage.number}${markerStr}\\par}`;
      // Content
      const lines = passage.content.split("\n");
      lines.forEach((line) => {
        rtf += `{\\pard\\qr\\plain\\f0\\fs22 ${linkifyRtf(line, passage.number)}\\par}`;
      });
    } else {
      // Passage header
      let header = `Pasaje ${passage.number}`;
      if (passage.title) header += ` — ${rtfEncode(passage.title)}`;
      rtf += `{\\pard\\plain\\f0\\fs28\\cf8\\b ${header}${markerStr}\\par}`;
      // Content
      const lines = passage.content.split("\n");
      lines.forEach((line) => {
        rtf += `{\\pard\\qr\\plain\\f0\\fs22 ${linkifyRtf(line, passage.number)}\\par}`;
      });
      // Links
      if (passage.outgoingLinks.length > 0) {
        rtf += `{\\pard\\plain\\f0\\fs20\\cf8\\b Opciones:\\par}`;
        passage.outgoingLinks.forEach((link) => {
          const text = link.linkText || `Continuar al pasaje ${link.target.number}`;
          rtf += `{\\pard\\plain\\f0\\fs20 \\tab \\u9658? ${rtfEncode(text)}\\par}`;
        });
      }
    }
    rtf += `{\\pard\\plain\\fs20\\par}`;
  });

  rtf += `}`;
  return rtf;
}
