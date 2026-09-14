import { parseDocx } from "./docx";
import { parseOdt } from "./odt";
import { extractPassagesFromText, detectLinksInPassage, type ParsedPassage } from "./txt";

export type { ParsedPassage };

export interface ParseResult {
  passages: ParsedPassage[];
  rawText: string;
  errors: string[];
}

export async function parseFile(
  buffer: Buffer,
  filename: string
): Promise<ParseResult> {
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
        // .doc files (old format) - try mammoth first, may fail
        try {
          rawText = await parseDocx(buffer);
        } catch {
          errors.push(
            "Formato .doc no soportado directamente. Por favor, convierte a .docx primero."
          );
        }
        break;
      case "rtf":
        // Basic RTF stripping
        rawText = buffer.toString("utf-8")
          .replace(/\{[^{}]*\}/g, "") // Remove groups
          .replace(/\\[a-z]+\d*\s?/g, "") // Remove commands
          .replace(/[{}]/g, ""); // Remove braces
        break;
      case "html":
      case "htm":
        rawText = buffer.toString("utf-8")
          .replace(/<[^>]+>/g, " ") // Remove tags
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

  const passages = extractPassagesFromText(rawText);

  return {
    passages,
    rawText,
    errors,
  };
}

export { extractPassagesFromText, detectLinksInPassage };
