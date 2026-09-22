import mammoth from "mammoth";

export async function parseDocx(buffer: Buffer): Promise<string> {
  // For large files, skip mammoth to avoid OOM — use binary fallback (under 4MB Vercel limit)
  if (buffer.length > 3 * 1024 * 1024) {
    console.warn("DOCX too large for mammoth, using binary fallback");
    return extractRawTextFromBinary(buffer);
  }

  try {
    const result = await mammoth.extractRawText({ buffer });

    if (result.messages.length > 0) {
      console.warn("DOCX parsing warnings:", result.messages);
    }

    return result.value;
  } catch (error) {
    console.warn("DOCX parsing failed, attempting raw text extraction:", error);
    return extractRawTextFromBinary(buffer);
  }
}

// Attempt to extract readable text from binary .doc files
function extractRawTextFromBinary(buffer: Buffer): string {
  const text = buffer.toString("utf-8");

  // Extract printable ASCII + common Unicode characters
  const readable = text.replace(/[^\x20-\x7E\u00A0-\u00FF\u0100-\u024F\u1E00-\u1EFF\n\r\t]/g, " ");

  // Collapse multiple spaces
  const cleaned = readable.replace(/ {3,}/g, "\n").replace(/\n{3,}/g, "\n\n").trim();

  if (cleaned.length < 10) {
    throw new Error("No se pudo extraer texto del archivo. Intenta convertir a .docx primero.");
  }

  return cleaned;
}
