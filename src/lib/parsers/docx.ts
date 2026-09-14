import mammoth from "mammoth";

export async function parseDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  
  if (result.messages.length > 0) {
    console.warn("DOCX parsing warnings:", result.messages);
  }
  
  return result.value;
}
