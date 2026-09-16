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
  let rawText = "";

  const ext = filename.toLowerCase().split(".").pop();

  try {
    switch (ext) {
      case "txt":
        rawText = buffer.toString("utf-8");
        break;
      case "docx":
        rawText = await parseDocx(buffer);
        break;
      case "odt":
        rawText = await parseOdt(buffer);
        break;
      case "doc":
        try {
          rawText = await parseDocx(buffer);
        } catch {
          errors.push(
            "Formato .doc no soportado directamente. Por favor, convierte a .docx primero."
          );
        }
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
        errors.push(`Formato no soportado: ${ext}`);
    }
  } catch (error) {
    errors.push(`Error al parsear ${ext}: ${error}`);
  }

  const result = extractPassagesFromText(rawText);

  return {
    passages: result.passages,
    links: result.links,
    rawText,
    errors,
    warnings: result.warnings || [],
  };
}

export { extractPassagesFromText, detectLinksInPassage };
