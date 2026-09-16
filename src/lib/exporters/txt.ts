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

  let txt = `${project.title}\n`;
  txt += `${"=".repeat(project.title.length)}\n\n`;

  project.passages.forEach((passage, idx) => {
    if (readingMode) {
      if (idx > 0) txt += `\n* * *\n\n`;
      txt += `${passage.content}\n`;
      if (passage.outgoingLinks.length > 0) {
        txt += `\n`;
        passage.outgoingLinks.forEach((link, linkIdx) => {
          const text = link.linkText || `Continuar al pasaje ${link.target.number}`;
          if (linkIdx > 0) txt += ` · `;
          txt += `${text}`;
        });
        txt += `\n`;
      }
      txt += `\n`;
    } else {
      txt += `\n--- PASAJE ${passage.number}`;
      if (passage.title) txt += ` — ${passage.title}`;
      if (passage.number === 1) txt += " [INICIO]";
      if (passage.isEndpoint) txt += " [FIN]";
      txt += ` ---\n\n`;
      txt += `${passage.content}\n\n`;
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
