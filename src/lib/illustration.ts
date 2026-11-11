import {
  MAX_IMAGE_SIZE,
  IMAGE_MIME_EXT,
  detectImageMime,
  sanitizeSvg,
} from "@/lib/image-validate";

export type IllustrationImage = {
  data: Buffer;
  mime: string;
  ext: string;
  width: number;
  height: number;
};

const BLOB_HOST_SUFFIX = ".blob.vercel-storage.com";
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

function extraAllowedHosts(): string[] {
  return (process.env.ILLUSTRATION_ALLOWED_HOSTS || "")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
}

function hostMatches(host: string, allowed: string[]): boolean {
  return allowed.some((entry) => {
    if (entry.startsWith(".")) return host === entry.slice(1) || host.endsWith(entry);
    return host === entry;
  });
}

/**
 * Only same-origin relative paths, Vercel Blob URLs and explicitly allowed
 * hosts may be used as a passage illustration. This prevents the exporters
 * from turning a stored URL into a server-side request to an arbitrary host.
 */
export function isAllowedIllustrationUrl(raw: string | null | undefined): boolean {
  if (!raw) return false;
  const value = raw.trim();
  if (!value || /[\u0000-\u001f\u007f]/.test(value)) return false;

  // Relative path served by the app itself.
  if (value.startsWith("/") && !value.startsWith("//")) return true;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") return false;
  if (url.username || url.password) return false;

  const host = url.hostname.toLowerCase();
  const allowed = extraAllowedHosts();

  if (hostMatches(host, allowed)) return true;
  if (host.endsWith(BLOB_HOST_SUFFIX)) return true;

  // Local development only. Never trust loopback on a production server.
  if (process.env.NODE_ENV !== "production" && LOCAL_HOSTS.has(host)) {
    return url.protocol === "http:" || url.protocol === "https:";
  }

  return false;
}

function ascii(bytes: Uint8Array, start: number, end: number): string {
  let out = "";
  for (let i = start; i < end && i < bytes.length; i++) {
    out += String.fromCharCode(bytes[i]);
  }
  return out;
}

function readUInt24LE(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
}

function pngDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length < 24) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return {
    width: view.getUint32(16),
    height: view.getUint32(20),
  };
}

function jpegDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length < 4) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset++;
      continue;
    }
    const marker = bytes[offset + 1];
    if (marker === 0xff) {
      offset++;
      continue;
    }
    if (marker === 0xd8 || marker === 0xd9) {
      offset += 2;
      continue;
    }
    if (marker === 0xda) break;
    const length = view.getUint16(offset + 2);
    if (length < 2) break;
    if (
      marker >= 0xc0 &&
      marker <= 0xcf &&
      marker !== 0xc4 &&
      marker !== 0xc8 &&
      marker !== 0xcc
    ) {
      return {
        width: view.getUint16(offset + 7),
        height: view.getUint16(offset + 5),
      };
    }
    offset += 2 + length;
  }
  return null;
}

function webpDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length < 30) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const chunk = ascii(bytes, 12, 16);

  if (chunk === "VP8X") {
    return {
      width: 1 + readUInt24LE(bytes, 24),
      height: 1 + readUInt24LE(bytes, 27),
    };
  }
  if (chunk === "VP8L" && bytes[20] === 0x2f) {
    const bits = view.getUint32(21, true);
    return {
      width: (bits & 0x3fff) + 1,
      height: ((bits >> 14) & 0x3fff) + 1,
    };
  }
  if (chunk === "VP8 " && bytes[23] === 0x9d && bytes[24] === 0x01 && bytes[25] === 0x2a) {
    return {
      width: view.getUint16(26, true) & 0x3fff,
      height: view.getUint16(28, true) & 0x3fff,
    };
  }
  return null;
}

function svgDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  const head = new TextDecoder("utf-8").decode(bytes.subarray(0, 4096));
  const viewBox = head.match(/viewBox\s*=\s*["']\s*([-\d.]+)[\s,]+([-\d.]+)[\s,]+([-\d.]+)[\s,]+([-\d.]+)\s*["']/i);
  if (viewBox) {
    const width = Number.parseFloat(viewBox[3]);
    const height = Number.parseFloat(viewBox[4]);
    if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
      return { width, height };
    }
  }
  const width = head.match(/\swidth\s*=\s*["']\s*([\d.]+)/i);
  const height = head.match(/\sheight\s*=\s*["']\s*([\d.]+)/i);
  if (width && height) {
    const parsedWidth = Number.parseFloat(width[1]);
    const parsedHeight = Number.parseFloat(height[1]);
    if (Number.isFinite(parsedWidth) && Number.isFinite(parsedHeight) && parsedWidth > 0 && parsedHeight > 0) {
      return { width: parsedWidth, height: parsedHeight };
    }
  }
  return null;
}

export function parseImageDimensions(
  bytes: Uint8Array,
  mime: string
): { width: number; height: number } {
  let dimensions: { width: number; height: number } | null = null;
  if (mime === "image/png") dimensions = pngDimensions(bytes);
  else if (mime === "image/jpeg") dimensions = jpegDimensions(bytes);
  else if (mime === "image/webp") dimensions = webpDimensions(bytes);
  else if (mime === "image/svg+xml") dimensions = svgDimensions(bytes);

  const width = dimensions?.width ?? 1200;
  const height = dimensions?.height ?? 800;
  return {
    width: Math.min(20000, Math.max(1, Math.round(width))),
    height: Math.min(20000, Math.max(1, Math.round(height))),
  };
}

/**
 * Downloads an illustration from a trusted URL and normalizes it. Returns
 * null for relative paths, unsupported formats, oversized payloads or any
 * error, so exports never fail because of a broken image.
 */
export async function fetchIllustration(
  raw: string | null | undefined,
  options: { maxBytes?: number; timeoutMs?: number } = {}
): Promise<IllustrationImage | null> {
  if (!isAllowedIllustrationUrl(raw)) return null;
  const value = raw!.trim();
  if (value.startsWith("/") && !value.startsWith("//")) return null;

  const maxBytes = options.maxBytes ?? MAX_IMAGE_SIZE;
  const timeoutMs = options.timeoutMs ?? 12000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(value, {
      redirect: "follow",
      signal: controller.signal,
      headers: { Accept: "image/*" },
      cache: "no-store",
    });
    if (!response.ok) return null;
    if (response.url && !isAllowedIllustrationUrl(response.url)) return null;

    const declaredLength = Number(response.headers.get("content-length") || 0);
    if (declaredLength > maxBytes) return null;

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > maxBytes) return null;

    let data = Buffer.from(buffer);
    const mime = detectImageMime(data);
    if (!mime) return null;

    if (mime === "image/svg+xml") {
      const clean = sanitizeSvg(data.toString("utf8"));
      if (!/<svg[\s>]/i.test(clean)) return null;
      data = Buffer.from(clean, "utf8");
    }

    const { width, height } = parseImageDimensions(data, mime);
    return { data, mime, ext: IMAGE_MIME_EXT[mime], width, height };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchIllustrations(
  passages: { number: number; illustration?: string | null }[],
  options: { maxCount?: number; maxTotalBytes?: number } = {}
): Promise<Map<number, IllustrationImage>> {
  const maxCount = options.maxCount ?? 60;
  const maxTotalBytes = options.maxTotalBytes ?? 40 * 1024 * 1024;
  const queue = passages.filter((passage) => Boolean(passage.illustration?.trim()));
  const result = new Map<number, IllustrationImage>();

  let cursor = 0;
  let totalBytes = 0;

  const worker = async () => {
    while (true) {
      const index = cursor++;
      if (index >= queue.length || result.size >= maxCount || totalBytes >= maxTotalBytes) {
        return;
      }
      const passage = queue[index];
      const image = await fetchIllustration(passage.illustration);
      if (!image) continue;
      if (result.size >= maxCount || totalBytes + image.data.length > maxTotalBytes) {
        return;
      }
      totalBytes += image.data.length;
      result.set(passage.number, image);
    }
  };

  const workers = Array.from(
    { length: Math.min(4, queue.length) },
    () => worker()
  );
  await Promise.all(workers);
  return result;
}

/**
 * Embeds up to a modest number of illustrations as data URIs for the PDF
 * renderer. Chrome would normally download them, but embedding makes the
 * generated file independent from the blob host and from network latency.
 */
export async function loadIllustrationDataUris(
  passages: { number: number; illustration?: string | null }[]
): Promise<Map<number, string>> {
  const images = await fetchIllustrations(passages, {
    maxCount: 24,
    maxTotalBytes: 24 * 1024 * 1024,
  });
  const map = new Map<number, string>();
  for (const [number, image] of images) {
    map.set(number, `data:${image.mime};base64,${image.data.toString("base64")}`);
  }
  return map;
}
