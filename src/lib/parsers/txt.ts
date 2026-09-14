import mammoth from "mammoth";

export interface ParsedPassage {
  number: number;
  title?: string;
  content: string;
  isStart: boolean;
  isEndpoint: boolean;
}

export async function parseDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

export function extractPassagesFromText(text: string): ParsedPassage[] {
  const passages: ParsedPassage[] = [];
  
  // Split by common gamebook separators
  // Patterns: "1.", "Pasaje 1", "---", numbers at start of line, etc.
  const separators = [
    /\n\s*(\d+)\s*[\.\)]\s*\n/g, // "1." or "1)" on its own line
    /\n\s*[Pp]asaje\s+(\d+)\s*\n/g, // "Pasaje 1"
    /\n\s*---\s*\n/g, // "---" separator
    /\n\s*\*\*\*\s*\n/g, // "***" separator
    /\n\s*#{1,3}\s+(\d+)/g, // "# 1" or "## 1" markdown headers
  ];

  // Try to find passage boundaries
  let segments: string[] = [];
  
  // First, try numbered patterns
  const numberedPattern = /\n\s*(?:Pasaje\s+)?(\d+)\s*[\.\)]\s*\n/g;
  let match;
  const positions: { pos: number; num: number }[] = [];
  
  while ((match = numberedPattern.exec(text)) !== null) {
    positions.push({ pos: match.index, num: parseInt(match[1]) });
  }

  if (positions.length > 1) {
    // Extract passages based on positions
    for (let i = 0; i < positions.length; i++) {
      const start = positions[i].pos;
      const end = i + 1 < positions.length ? positions[i + 1].pos : text.length;
      const passageText = text.slice(start, end).trim();
      
      // Extract title from first line if present
      const lines = passageText.split("\n");
      const firstLine = lines[0].trim();
      const titleMatch = firstLine.match(/(?:Pasaje\s+)?\d+\s*[\.\)]\s*(.*)/);
      const title = titleMatch?.[1]?.trim() || undefined;
      
      const content = lines.slice(1).join("\n").trim();
      
      passages.push({
        number: positions[i].num,
        title,
        content,
        isStart: positions[i].num === 1,
        isEndpoint: content.length === 0 || /\b(fin|termina|acaba|muerte|game over)\b/i.test(content),
      });
    }
  } else {
    // If no numbered passages found, split by double newlines
    segments = text.split(/\n\s*\n/).filter(s => s.trim().length > 0);
    
    segments.forEach((segment, index) => {
      const lines = segment.trim().split("\n");
      const firstLine = lines[0].trim();
      
      // Check if first line looks like a title
      const isTitle = firstLine.length < 100 && (
        firstLine === firstLine.toUpperCase() ||
        /^[A-Z]/.test(firstLine)
      );
      
      passages.push({
        number: index + 1,
        title: isTitle ? firstLine : undefined,
        content: isTitle ? lines.slice(1).join("\n").trim() : segment.trim(),
        isStart: index === 0,
        isEndpoint: false,
      });
    });
  }

  return passages;
}

export function detectLinksInPassage(
  content: string,
  allPassageNumbers: number[]
): { targetNumber: number; text: string }[] {
  const links: { targetNumber: number; text: string }[] = [];
  
  // Common patterns for gamebook links
  const patterns = [
    /(?:ve[rs]?|ir?\s+a|contin[uú]a?\s+en|pasa(?:r)?\s+a|segue(?:ix|isce)?\s+(?:a|en))\s+(?:el\s+)?(?:pasaje\s+)?(\d+)/gi,
    /(?:si\s+.+?,?\s+)?(?:ve|ir|continuar|pasar)\s+(?:al?\s+)?(\d+)/gi,
    /(?:\d+)\s*→\s*(\d+)/g, // "1 → 5"
    /(?:\d+)\s*->\s*(\d+)/g, // "1 -> 5"
    /\[(\d+)\]/g, // "[5]"
    /\((\d+)\)/g, // "(5)"
  ];

  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const targetNumber = parseInt(match[1]);
      if (allPassageNumbers.includes(targetNumber)) {
        links.push({
          targetNumber,
          text: match[0],
        });
      }
    }
  });

  // Remove duplicates
  const uniqueLinks = links.filter((link, index, self) =>
    index === self.findIndex(l => l.targetNumber === link.targetNumber)
  );

  return uniqueLinks;
}
