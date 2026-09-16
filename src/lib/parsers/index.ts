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
        rawText = buffer.toString("utf-8");
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
          rawText = buffer.toString("utf-8")
            .replace(/[^\x20-\x7E\u00A0-\u00FF\u0100-\u024F\u1E00-\u1EFF\n\r\t]/g, " ")
            .replace(/ {3,}/g, "\n")
            .trim();
        }
        break;
      case "odt":
        rawText = await parseOdt(buffer);
        break;
      case "rtf":
        rawText = buffer.toString("utf-8")
          .replace(/\{[^{}]*\}/g, "")
          .replace(/\\[a-z]+\d*\s?/g, "")
          .replace(/[{}]/g, "");
        break;
      case "html":
      case "htm":
        rawText = buffer.toString("utf-8")
          .replace(/<[^>]+>/g, " ")
          .replace(/&nbsp;/g, " ")
          .replace(/&[a-z]+;/g, "")
          .replace(/\s+/g, " ")
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
