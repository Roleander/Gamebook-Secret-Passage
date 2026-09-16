import JSZip from "jszip";

export async function parseOdt(buffer: Buffer): Promise<string> {
  try {
    const zip = await JSZip.loadAsync(buffer);

    const contentXml = await zip.file("content.xml")?.async("string");

    if (!contentXml) {
      throw new Error("Archivo ODT inválido: content.xml no encontrado");
    }

    const text = extractTextFromXml(contentXml);
    return text;
  } catch (error) {
    if (error instanceof Error && error.message.includes("content.xml")) {
      throw error;
    }
    throw new Error(`Error al procesar archivo ODT: ${error}`);
  }
}

function extractTextFromXml(xml: string): string {
  let text = xml;

  // Remove XML declaration and metadata
  text = text.replace(/<\?xml[^?]*\?>/g, "");
  text = text.replace(/<office:document-content[^>]*>/g, "");
  text = text.replace(/<\/office:document-content>/g, "");

  // Convert common ODT elements to readable text
  text = text.replace(/<text:p[^>]*>/g, "\n");
  text = text.replace(/<\/text:p>/g, "");
  text = text.replace(/<text:s[^>]*\/>/g, " ");
  text = text.replace(/<text:tab[^>]*\/>/g, "\t");
  text = text.replace(/<text:line-break[^>]*\/>/g, "\n");

  // Handle headings
  text = text.replace(/<text:h[^>]*>/g, "\n# ");
  text = text.replace(/<\/text:h>/g, "\n");

  // Handle lists
  text = text.replace(/<text:list-item[^>]*>/g, "\n- ");
  text = text.replace(/<\/text:list-item>/g, "");

  // Remove remaining XML tags
  text = text.replace(/<[^>]+>/g, "");

  // Decode HTML entities
  text = text.replace(/&amp;/g, "&");
  text = text.replace(/&lt;/g, "<");
  text = text.replace(/&gt;/g, ">");
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&apos;/g, "'");
  text = text.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code)));
  text = text.replace(/&nbsp;/g, " ");

  // Clean up whitespace
  text = text.replace(/\n\s*\n/g, "\n\n");
  text = text.trim();

  return text;
}
