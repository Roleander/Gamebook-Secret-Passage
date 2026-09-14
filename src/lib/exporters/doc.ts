import { db } from "@/lib/db";

interface Passage {
  id: string;
  number: number;
  title: string | null;
  content: string;
  outgoingLinks: {
    target: { number: number };
    linkText: string | null;
  }[];
}

export async function generateDOC(projectId: string): Promise<string> {
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

  // Generate RTF format with bookmarks for navigation
  let rtf = `{\\rtf1\\ansi\\deff0
{\\fonttbl{\\f0 Times New Roman;}{\\f1 Courier New;}}
{\\colortbl;\\red139\\green69\\blue19;\\red0\\green0\\blue0;\\red34\\green197\\blue94;\\red239\\green68\\blue68;\\red0\\green0\\blue255;}
\\paperw12240\\paperh15840\\margl1440\\margr1440\\margt1440\\margb1440
`;

  // Title
  rtf += `{\\fs48\\b\\cf1 ${escapeRTF(project.title)}}\\par\\par`;
  rtf += `{\\fs24\\i Librojuego generado por Secret Passage}\\par\\par\\par`;

  // Table of contents with hyperlinks
  rtf += `{\\fs32\\b\\cf1 \'CDNDICE}\\par\\par`;
  project.passages.forEach((passage) => {
    rtf += `{\\fs24\\cf5 {\\field{\\*\\fldinst{HYPERLINK "#passage${passage.number}"}}{\\fldrslt{\\cf5 Pasaje ${passage.number}`;
    if (passage.title) rtf += ` - ${escapeRTF(passage.title)}`;
    rtf += `}}}\\par`;
  });
  rtf += `\\par\\par`;

  // Passages with bookmarks
  project.passages.forEach((passage) => {
    // Bookmark for this passage
    rtf += `{\\bkmkstart passage${passage.number}}`;
    
    // Passage header
    rtf += `{\\fs28\\b\\cf1 ---- PASAJE ${passage.number}`;
    if (passage.title) rtf += ` \\u8212  ${escapeRTF(passage.title)}`;
    if (passage.number === 1) rtf += ` {\\cf3 [INICIO]}`;
    if (passage.isEndpoint) rtf += ` {\\cf4 [FIN]}`;
    rtf += ` ----}\\par\\par`;

    // Content (preserve line breaks)
    const lines = passage.content.split("\n");
    lines.forEach((line) => {
      // Detect and convert inline references to hyperlinks
      let processedLine = escapeRTF(line);
      
      // Match patterns like "pasaje 123", "apartado 123", etc.
      processedLine = processedLine.replace(
        /(?:pasaje|apartado|punto|secci[oó]n)\\s+(\\d+)/gi,
        (match, num) => `{\\field{\\*\\fldinst{HYPERLINK "#passage${num}"}}{\\fldrslt{\\cf5 ${match}}}}`
      );
      
      rtf += `{\\fs24\\cf2 ${processedLine}}\\par`;
    });

    rtf += `\\par`;

    // Links with hyperlinks
    if (passage.outgoingLinks.length > 0) {
      rtf += `{\\fs24\\b\\cf1 Opciones:}\\par`;
      passage.outgoingLinks.forEach((link) => {
        const text = link.linkText || `Continuar al pasaje ${link.target.number}`;
        rtf += `{\\fs24   \\u9658  {\\field{\\*\\fldinst{HYPERLINK "#passage${link.target.number}"}}{\\fldrslt{\\cf5\\ul ${escapeRTF(text)}}}}\\par`;
      });
      rtf += `\\par`;
    }

    rtf += `{\\bkmkend passage${passage.number}}`;
  });

  rtf += `}`;

  return rtf;
}

function escapeRTF(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\{/g, "\\{")
    .replace(/\}/g, "\\}")
    .replace(/\n/g, "\\par ");
}
