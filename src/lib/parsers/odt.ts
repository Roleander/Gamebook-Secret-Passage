import JSZip from "jszip";
import { extractPassagesFromText } from "./txt";

// Note: We need to install jszip for ODT parsing
// npm install jszip @types/jszip

export async function parseOdt(buffer: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  
  // ODT files store content in content.xml
  const contentXml = await zip.file("content.xml")?.async("string");
  
  if (!contentXml) {
    throw new Error("Invalid ODT file: content.xml not found");
  }

  // Extract text from XML
  const text = extractTextFromXml(contentXml);
  return text;
}

function extractTextFromXml(xml: string): string {
  // Simple XML text extraction (removes tags, preserves text content)
  // For production, consider using a proper XML parser like xml2js
  
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
  
  // Clean up whitespace
  text = text.replace(/\n\s*\n/g, "\n\n");
  text = text.trim();
  
  return text;
}
