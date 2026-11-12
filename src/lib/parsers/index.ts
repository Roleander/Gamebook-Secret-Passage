import { parseDocx } from "./docx";
import { parseOdt } from "./odt";
import { extractPassagesFromText, detectLinksInPassage, type ParsedPassage, type ParseResult } from "./txt";

export type { ParsedPassage, ParseResult };

export interface FileParseResult {
  passages: ParsedPassage[];
  links: { sourceNumber: number; targetNumber: number; text: string }[];
  rawText: string;
  errors: string[];
  warnings: string[];
}

function decodeTextBuffer(buffer: Buffer): { text: string; encoding: string } {
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xef &&
    buffer[1] === 0xbb &&
    buffer[2] === 0xbf
  ) {
    return {
      text: new TextDecoder("utf-8").decode(buffer.subarray(3)),
      encoding: "utf-8",
    };
  }
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    return {
      text: new TextDecoder("utf-16le").decode(buffer.subarray(2)),
      encoding: "utf-16le",
    };
  }
  if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
    return {
      text: new TextDecoder("utf-16be").decode(buffer.subarray(2)),
      encoding: "utf-16be",
    };
  }

  try {
    return {
      text: new TextDecoder("utf-8", { fatal: true }).decode(buffer),
      encoding: "utf-8",
    };
  } catch {
    try {
      return {
        text: new TextDecoder("windows-1252").decode(buffer),
        encoding: "windows-1252",
      };
    } catch {
      return { text: buffer.toString("latin1"), encoding: "latin1" };
    }
  }
}

function decodeWithWarning(buffer: Buffer, warnings: string[]): string {
  const { text, encoding } = decodeTextBuffer(buffer);
  if (encoding !== "utf-8") {
    const label =
      encoding === "windows-1252" ? "Windows-1252" : encoding.toUpperCase();
    warnings.push(
      `Archivo leído como ${label} (no era UTF-8 válido). Revisa que los acentos se vean bien.`
    );
  }
  return text;
}

export async function parseFile(
  buffer: Buffer,
  filename: string
): Promise<FileParseResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  let rawText = "";

  const ext = filename.toLowerCase().split(".").pop();

  if (!ext) {
    errors.push("No se pudo determinar el tipo de archivo");
    return { passages: [], links: [], rawText: "", errors, warnings };
  }

  try {
    switch (ext) {
      case "txt":
        rawText = decodeWithWarning(buffer, warnings);
        break;
      case "docx":
        rawText = await parseDocx(buffer);
        break;
      case "doc":
        // Old binary .doc format — mammoth may fail, fallback to raw extraction
        try {
          rawText = await parseDocx(buffer);
        } catch (docError) {
          warnings.push(
            `Formato .doc legacy: ${docError instanceof Error ? docError.message : "error desconocido"}. Se intentó extracción de texto raw.`
          );
          // Last resort: try to extract readable text from binary
          rawText = decodeWithWarning(buffer, warnings)
            .replace(/[^\x20-\x7E\u00A0-\u00FF\u0100-\u024F\u1E00-\u1EFF\n\r\t]/g, " ")
            .replace(/ {3,}/g, "\n")
            .trim();
        }
        break;
      case "odt":
        rawText = await parseOdt(buffer);
        break;
      case "rtf":
        rawText = decodeWithWarning(buffer, warnings)
          .replace(/\{[^{}]*\}/g, "")
          .replace(/\\[a-z]+\d*\s?/g, "")
          .replace(/[{}]/g, "");
        break;
      case "html":
      case "htm":
        rawText = decodeWithWarning(buffer, warnings)
          .replace(/\r\n?/g, "\n")
          .replace(/<br\s*\/?>/gi, "\n")
          .replace(
            /<\/(?:p|div|h[1-6]|li|tr|section|article|blockquote|td|th)>/gi,
            "\n"
          )
          .replace(/<[^>]+>/g, " ")
          .replace(/&nbsp;/g, " ")
          .replace(/&[a-z]+;/g, "")
          .replace(/[^\S\n]+/g, " ")
          .replace(/\n{3,}/g, "\n\n")
          .trim();
        break;
      default:
        errors.push(`Formato no soportado: .${ext}. Use .txt, .doc, .docx, .odt, .html o .rtf`);
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    errors.push(`Error al parsear archivo .${ext}: ${msg}`);
  }

  if (!rawText || rawText.trim().length === 0) {
    errors.push(`No se pudo extraer texto del archivo .${ext}. Verifica que no esté corrupto.`);
    return { passages: [], links: [], rawText: "", errors, warnings };
  }

  const result = extractPassagesFromText(rawText);

  if (result.passages.length === 0) {
    warnings.push("No se detectaron pasajes numerados en el archivo. El contenido se guardó como texto.");
  }

  return {
    passages: result.passages,
    links: result.links,
    rawText,
    errors,
    warnings: [...warnings, ...(result.warnings || [])],
  };
}

export { extractPassagesFromText, detectLinksInPassage };
