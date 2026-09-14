/**
 * Passage Detector Agent
 * 
 * Analiza texto plano y detecta automáticamente dónde empiezan y terminan
 * los pasajes de un librojuego, incluso cuando no hay marcadores explícitos.
 */

export interface DetectedPassage {
  startLine: number;
  endLine: number;
  content: string;
  confidence: number;
  markers: string[];
}

export class PassageDetectorAgent {
  private patterns: { regex: RegExp; weight: number; name: string }[] = [];

  constructor() {
    this.initializePatterns();
  }

  private initializePatterns() {
    // Patterns that indicate passage boundaries
    this.patterns = [
      // Explicit numbering
      { regex: /^\d+[\.\)\s]/gm, weight: 10, name: "numbered" },
      { regex: /^pasaje\s+\d+/gim, weight: 10, name: "pasaje_prefix" },
      { regex: /^section\s+\d+/gim, weight: 8, name: "section_prefix" },
      { regex: /^capitulo\s+\d+/gim, weight: 8, name: "chapter_prefix" },

      // Separators
      { regex: /^\s*---\s*$/gm, weight: 7, name: "horizontal_rule" },
      { regex: /^\s*\*\*\*\s*$/gm, weight: 7, name: "asterisk_separator" },
      { regex: /^\s*===+\s*$/gm, weight: 7, name: "equals_separator" },

      // Decision points (common in gamebooks)
      { regex: /si\s+.+,\s+ve\s+al?\s+pasaje\s+\d+/gim, weight: 9, name: "conditional_link" },
      { regex: /si\s+.+,\s+continua\s+en\s+\d+/gim, weight: 9, name: "conditional_continue" },
      { regex: /\[ve\s+al?\s+pasaje\s+\d+\]/gim, weight: 9, name: "bracket_link" },

      // End markers
      { regex: /\b(fin|termina|acaba|game\s*over|muerte)\b/gi, weight: 6, name: "end_marker" },

      // Title-like lines (short, capitalized, followed by longer content)
      { regex: /^[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s]{2,50}$/gm, weight: 4, name: "possible_title" },
    ];
  }

  /**
   * Detect passages in a text
   */
  detect(text: string): DetectedPassage[] {
    const lines = text.split("\n");
    const passageScores: number[] = new Array(lines.length).fill(0);

    // Score each line for passage boundary likelihood
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      let lineScore = 0;
      const markers: string[] = [];

      for (const pattern of this.patterns) {
        const matches = line.match(pattern.regex);
        if (matches) {
          lineScore += pattern.weight * matches.length;
          markers.push(pattern.name);
        }
      }

      // Bonus for blank lines (often separate passages)
      if (line.trim() === "" && i > 0 && i < lines.length - 1) {
        const prevLine = lines[i - 1];
        const nextLine = lines[i + 1];
        if (prevLine.trim() !== "" && nextLine.trim() !== "") {
          lineScore += 2;
        }
      }

      passageScores[i] = lineScore;
    }

    // Find local maxima (likely passage starts)
    const passages: DetectedPassage[] = [];
    const threshold = 5;
    let currentPassageStart = 0;

    for (let i = 1; i < lines.length; i++) {
      const isHighScore = passageScores[i] >= threshold;
      const prevIsLow = passageScores[i - 1] < threshold;

      if (isHighScore && prevIsLow && i > currentPassageStart + 1) {
        // End previous passage
        passages.push({
          startLine: currentPassageStart,
          endLine: i - 1,
          content: lines.slice(currentPassageStart, i).join("\n").trim(),
          confidence: Math.min(1, passageScores[currentPassageStart] / 15),
          markers: this.getLineMarkers(lines[currentPassageStart]),
        });
        currentPassageStart = i;
      }
    }

    // Add final passage
    if (currentPassageStart < lines.length) {
      passages.push({
        startLine: currentPassageStart,
        endLine: lines.length - 1,
        content: lines.slice(currentPassageStart).join("\n").trim(),
        confidence: Math.min(1, passageScores[currentPassageStart] / 15),
        markers: this.getLineMarkers(lines[currentPassageStart]),
      });
    }

    return passages;
  }

  private getLineMarkers(line: string): string[] {
    const markers: string[] = [];
    for (const pattern of this.patterns) {
      if (pattern.regex.test(line)) {
        markers.push(pattern.name);
      }
    }
    return markers;
  }

  /**
   * Suggest passage numbers for detected passages
   */
  suggestNumbers(passages: DetectedPassage[]): number[] {
    return passages.map((_, index) => index + 1);
  }
}

/**
 * Create a passage detector agent instance
 */
export function createPassageDetector(): PassageDetectorAgent {
  return new PassageDetectorAgent();
}
