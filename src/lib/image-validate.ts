import sanitizeHtml from "sanitize-html";

export const MAX_IMAGE_SIZE = 2 * 1024 * 1024;

export const ALLOWED_IMAGE_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
] as const;

export const IMAGE_MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

function ascii(bytes: Uint8Array, start: number, end: number): string {
  let out = "";
  for (let i = start; i < end && i < bytes.length; i++) {
    out += String.fromCharCode(bytes[i]);
  }
  return out;
}

export function detectImageMime(bytes: Uint8Array): string | null {
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    ascii(bytes, 0, 4) === "RIFF" &&
    ascii(bytes, 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  const head = new TextDecoder("utf-8")
    .decode(bytes.subarray(0, 2048))
    .replace(/^\uFEFF/, "")
    .trimStart()
    .toLowerCase();
  if (
    head.startsWith("<?xml") ||
    head.startsWith("<svg") ||
    head.startsWith("<!doctype svg")
  ) {
    return "image/svg+xml";
  }
  return null;
}

const SVG_ALLOWED_TAGS = [
  "svg",
  "g",
  "path",
  "rect",
  "circle",
  "ellipse",
  "line",
  "polyline",
  "polygon",
  "text",
  "tspan",
  "defs",
  "linearGradient",
  "radialGradient",
  "stop",
  "clipPath",
  "mask",
  "symbol",
  "title",
  "desc",
];

const SVG_ALLOWED_ATTRIBUTES = [
  "id",
  "class",
  "xmlns",
  "viewBox",
  "preserveAspectRatio",
  "width",
  "height",
  "x",
  "y",
  "x1",
  "y1",
  "x2",
  "y2",
  "cx",
  "cy",
  "r",
  "rx",
  "ry",
  "d",
  "points",
  "transform",
  "opacity",
  "fill",
  "fill-rule",
  "fill-opacity",
  "stroke",
  "stroke-width",
  "stroke-opacity",
  "stroke-dasharray",
  "stroke-dashoffset",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-miterlimit",
  "clip-rule",
  "clip-path",
  "mask",
  "filter",
  "offset",
  "stop-color",
  "stop-opacity",
  "gradientUnits",
  "gradientTransform",
  "clipPathUnits",
  "maskUnits",
  "maskContentUnits",
  "font-family",
  "font-size",
  "font-weight",
  "text-anchor",
  "dominant-baseline",
  "letter-spacing",
  "xml:space",
  "style",
];

const noUrlValue = /^[^;{}()]+$/;

const SVG_ALLOWED_STYLES: Record<string, Record<string, RegExp[]>> = {
  "*": {
    fill: [noUrlValue],
    stroke: [noUrlValue],
    "fill-opacity": [/^[0-9.]+$/],
    "stroke-opacity": [/^[0-9.]+$/],
    "stroke-width": [/^[0-9.]+(px|em|rem|%)?$/],
    "stroke-dasharray": [/^[0-9.,\s]+$/],
    "stroke-dashoffset": [/^[0-9.]+(px|em|rem|%)?$/],
    "stroke-linecap": [/^(butt|round|square)$/],
    "stroke-linejoin": [/^(miter|round|bevel)$/],
    "fill-rule": [/^(nonzero|evenodd)$/],
    "clip-rule": [/^(nonzero|evenodd)$/],
    opacity: [/^[0-9.]+$/],
    display: [/^(inline|none|block|inline-block)$/],
    visibility: [/^(visible|hidden)$/],
    "font-family": [noUrlValue],
    "font-size": [/^[0-9.]+(px|em|rem|%)?$/],
    "font-weight": [/^[0-9]+$/],
    "text-anchor": [/^(start|middle|end)$/],
  },
};

export function sanitizeSvg(raw: string): string {
  return sanitizeHtml(raw, {
    allowedTags: SVG_ALLOWED_TAGS,
    allowedAttributes: { "*": SVG_ALLOWED_ATTRIBUTES },
    allowedStyles: SVG_ALLOWED_STYLES,
    allowedSchemes: [],
    allowProtocolRelative: false,
    disallowedTagsMode: "discard",
    parser: {
      lowerCaseTags: false,
      lowerCaseAttributeNames: false,
      decodeEntities: true,
    },
  });
}
