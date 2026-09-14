/**
 * Connection Finder Agent
 * 
 * Analiza el contenido de los pasajes y sugiere conexiones entre ellos
 * basándose en referencias de texto, lógica narrativa y patrones comunes.
 */

export interface Connection {
  sourceNumber: number;
  targetNumber: number;
  type: "explicit" | "implicit" | "suggested";
  text: string;
  confidence: number;
}

export interface AnalysisResult {
  connections: Connection[];
  orphanPassages: number[];
  deadEnds: number[];
  cycles: number[][];
}

export class ConnectionFinderAgent {
  private linkPatterns: { regex: RegExp; type: "explicit" | "implicit" }[] = [];

  constructor() {
    this.initializePatterns();
  }

  private initializePatterns() {
    this.linkPatterns = [
      // Explicit links
      { regex: /(?:ve|ir?\s+a|contin[uú]a?\s+en?)\s+(?:al?\s+)?(?:pasaje\s+)?(\d+)/gi, type: "explicit" },
      { regex: /(?:pasa(?:r)?|segue(?:ix|isce)?)\s+(?:al?\s+)?(\d+)/gi, type: "explicit" },
      { regex: /\[(\d+)\]/g, type: "explicit" },
      { regex: /\((\d+)\)/g, type: "explicit" },
      { regex: /→\s*(\d+)/g, type: "explicit" },
      { regex: /->\s*(\d+)/g, type: "explicit" },

      // Implicit links (contextual)
      { regex: /si\s+.+?,?\s+(?:entonces\s+)?(?:ve|ir|continuar)\s+(?:al?\s+)?(\d+)/gi, type: "implicit" },
      { regex: /de\s+lo\s+contrario,?\s+(?:ve|ir|continuar)\s+(?:al?\s+)?(\d+)/gi, type: "implicit" },
      { regex: /si\s+quieres.+?entonces.+?(\d+)/gi, type: "implicit" },
    ];
  }

  /**
   * Find connections between passages based on their content
   */
  findConnections(
    passages: { number: number; content: string }[]
  ): AnalysisResult {
    const connections: Connection[] = [];
    const passageMap = new Map(passages.map(p => [p.number, p]));
    const allNumbers = passages.map(p => p.number);

    // Find all connections in each passage
    for (const passage of passages) {
      for (const pattern of this.linkPatterns) {
        let match;
        const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
        
        while ((match = regex.exec(passage.content)) !== null) {
          const targetNumber = parseInt(match[1]);
          
          if (allNumbers.includes(targetNumber) && targetNumber !== passage.number) {
            connections.push({
              sourceNumber: passage.number,
              targetNumber,
              type: pattern.type,
              text: match[0],
              confidence: pattern.type === "explicit" ? 0.9 : 0.5,
            });
          }
        }
      }
    }

    // Deduplicate connections
    const uniqueConnections = this.deduplicateConnections(connections);

    // Find orphan passages (no incoming connections)
    const incomingTargets = new Set(uniqueConnections.map(c => c.targetNumber));
    const orphanPassages = passages
      .filter(p => !incomingTargets.has(p.number) && p.number !== 1)
      .map(p => p.number);

    // Find dead ends (no outgoing connections)
    const outgoingSources = new Set(uniqueConnections.map(c => c.sourceNumber));
    const deadEnds = passages
      .filter(p => !outgoingSources.has(p.number))
      .map(p => p.number);

    // Detect cycles
    const cycles = this.detectCycles(passages, uniqueConnections);

    return {
      connections: uniqueConnections,
      orphanPassages,
      deadEnds,
      cycles,
    };
  }

  private deduplicateConnections(connections: Connection[]): Connection[] {
    const seen = new Map<string, Connection>();
    
    for (const conn of connections) {
      const key = `${conn.sourceNumber}-${conn.targetNumber}`;
      const existing = seen.get(key);
      
      if (!existing || conn.confidence > existing.confidence) {
        seen.set(key, conn);
      }
    }
    
    return Array.from(seen.values());
  }

  private detectCycles(
    passages: { number: number; content: string }[],
    connections: Connection[]
  ): number[][] {
    const cycles: number[][] = [];
    const visited = new Set<number>();
    const recursionStack = new Set<number>();
    const path: number[] = [];

    const adjacencyMap = new Map<number, number[]>();
    for (const conn of connections) {
      const targets = adjacencyMap.get(conn.sourceNumber) || [];
      targets.push(conn.targetNumber);
      adjacencyMap.set(conn.sourceNumber, targets);
    }

    const dfs = (node: number) => {
      visited.add(node);
      recursionStack.add(node);
      path.push(node);

      const targets = adjacencyMap.get(node) || [];
      for (const target of targets) {
        if (!visited.has(target)) {
          dfs(target);
        } else if (recursionStack.has(target)) {
          // Found cycle
          const cycleStart = path.indexOf(target);
          cycles.push(path.slice(cycleStart));
        }
      }

      path.pop();
      recursionStack.delete(node);
    };

    for (const passage of passages) {
      if (!visited.has(passage.number)) {
        dfs(passage.number);
      }
    }

    return cycles;
  }

  /**
   * Suggest connections based on content similarity
   */
  suggestConnections(
    passages: { number: number; content: string }[]
  ): Connection[] {
    const suggestions: Connection[] = [];

    // Look for thematic connections
    const themes = this.extractThemes(passages);

    for (const passage of passages) {
      const passageThemes = this.extractPassageThemes(passage.content);
      
      for (const otherPassage of passages) {
        if (otherPassage.number === passage.number) continue;

        const otherThemes = this.extractPassageThemes(otherPassage.content);
        const similarity = this.calculateSimilarity(passageThemes, otherThemes);

        if (similarity > 0.3) {
          suggestions.push({
            sourceNumber: passage.number,
            targetNumber: otherPassage.number,
            type: "suggested",
            text: `Conexión temática detectada (${Math.round(similarity * 100)}% similitud)`,
            confidence: similarity * 0.5, // Lower confidence for suggestions
          });
        }
      }
    }

    return suggestions;
  }

  private extractThemes(passages: { number: number; content: string }[]): string[] {
    const allThemes = new Set<string>();
    for (const passage of passages) {
      const themes = this.extractPassageThemes(passage.content);
      themes.forEach(t => allThemes.add(t));
    }
    return Array.from(allThemes);
  }

  private extractPassageThemes(content: string): string[] {
    const themes: string[] = [];
    
    // Simple keyword-based theme extraction
    const themeKeywords: { [theme: string]: string[] } = {
      combate: ["batalla", "lucha", "espada", "enemigo", "monstruo", "atacar", "defender"],
      magia: ["hechizo", "magia", "encantamiento", "poder", "mágico", "brujo"],
      exploracion: ["camino", "sendero", "bosque", "cueva", "explorar", "aventura"],
      puzzles: ["acertijo", "enigma", "puzzle", "adivinanza", "resolver"],
      dialogue: ["hablar", "decir", "preguntar", "responder", "conversar"],
      treasure: ["tesoro", "oro", "objeto", "recompensa", "botín"],
    };

    const lowerContent = content.toLowerCase();
    
    for (const [theme, keywords] of Object.entries(themeKeywords)) {
      if (keywords.some(kw => lowerContent.includes(kw))) {
        themes.push(theme);
      }
    }

    return themes;
  }

  private calculateSimilarity(themes1: string[], themes2: string[]): number {
    if (themes1.length === 0 || themes2.length === 0) return 0;
    
    const intersection = themes1.filter(t => themes2.includes(t));
    const union = [...new Set([...themes1, ...themes2])];
    
    return intersection.length / union.length;
  }
}

/**
 * Create a connection finder agent instance
 */
export function createConnectionFinder(): ConnectionFinderAgent {
  return new ConnectionFinderAgent();
}
