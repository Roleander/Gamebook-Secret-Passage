import { mkdir, readdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
import { decompress } from "wawoff2";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const CSS_URL =
  "https://fonts.googleapis.com/css2?family=Cinzel:wght@700&family=Cinzel+Decorative:wght@700&family=EB+Garamond:ital,wght@0,400;0,600;1,400&family=Goudy+Bookletter+1911&family=IM+Fell+English&family=MedievalSharp&family=Pirata+One&family=UnifrakturCook:wght@700&family=UnifrakturMaguntia&display=swap";

const SUBSETS = new Set(["latin", "latin-ext"]);

const OFL_DIRS = {
  "EB Garamond": "ebgaramond",
  Cinzel: "cinzel",
  "Cinzel Decorative": "cinzeldecorative",
  "Goudy Bookletter 1911": "goudybookletter1911",
  "IM Fell English": "imfellenglish",
  MedievalSharp: "medievalsharp",
  "Pirata One": "pirataone",
  UnifrakturCook: "unifrakturcook",
  UnifrakturMaguntia: "unifrakturmaguntia",
};

async function main() {
  const cssRes = await fetch(CSS_URL, { headers: { "User-Agent": UA } });
  if (!cssRes.ok) throw new Error(`css2 HTTP ${cssRes.status}: ${await cssRes.text()}`);
  const css = await cssRes.text();

  const blockRe = /\/\*\s*([a-z-]+)\s*\*\/\s*(@font-face\s*\{[^}]*\})/g;
  const entries = [];
  const byKey = new Map();
  let m;
  while ((m = blockRe.exec(css))) {
    const subset = m[1];
    const block = m[2];
    if (!SUBSETS.has(subset)) continue;
    const family = /font-family:\s*'([^']+)'/.exec(block)?.[1];
    const style = /font-style:\s*(\w+)/.exec(block)?.[1] || "normal";
    const weight = /font-weight:\s*(\d+)/.exec(block)?.[1] || "400";
    const url = /url\((https:\/\/[^)]+)\)/.exec(block)?.[1];
    const unicodeRange = /unicode-range:\s*([^;]+);/.exec(block)?.[1]?.trim();
    if (!family || !url || !unicodeRange) continue;
    if (style === "italic" && subset === "latin-ext") continue;
    const slug = family.toLowerCase().replace(/[^a-z0-9]/g, "");
    const subsetTag = subset === "latin" ? "latin" : "latinext";
    const filename = `${slug}-${weight}${style === "italic" ? "i" : ""}-${subsetTag}.woff2`;
    const fontRes = await fetch(url, { headers: { "User-Agent": UA } });
    if (!fontRes.ok) throw new Error(`font HTTP ${fontRes.status}: ${url}`);
    const buf = Buffer.from(await fontRes.arrayBuffer());
    const hash = crypto.createHash("sha256").update(buf).digest("hex");
    const key = `${family}|${style}|${subset}|${hash}`;
    if (byKey.has(key)) {
      byKey.get(key).weights.push(Number(weight));
      continue;
    }
    await mkdir(path.join(root, "public", "fonts"), { recursive: true });
    await writeFile(path.join(root, "public", "fonts", filename), buf);
    const entry = {
      family,
      style,
      subset,
      unicodeRange,
      url: `/fonts/${filename}`,
      filename,
      weights: [Number(weight)],
      base64: buf.toString("base64"),
    };
    byKey.set(key, entry);
    entries.push(entry);
    console.log(`OK ${filename} (${buf.length} bytes)`);
  }

  if (entries.length === 0) throw new Error("No se pudo analizar ninguna fuente de css2");

  const weightOf = (e) =>
    e.weights.length === 1
      ? String(e.weights[0])
      : `${Math.min(...e.weights)} ${Math.max(...e.weights)}`;

  const publicDir = path.join(root, "public", "fonts");
  const keep = new Set(entries.map((e) => e.filename));
  for (const f of await readdir(publicDir)) {
    if (f.endsWith(".woff2") && !keep.has(f)) {
      await unlink(path.join(publicDir, f));
      console.log(`BORRADO ${f}`);
    }
  }

  const filesTs = `// Generado por scripts/gen-fonts.mjs — no editar a mano.
export interface FontFile {
  family: string;
  style: string;
  weight: string;
  subset: string;
  unicodeRange: string;
  url: string;
}

export const FONT_FILES: FontFile[] = ${JSON.stringify(
    entries.map((e) => ({
      family: e.family,
      style: e.style,
      weight: weightOf(e),
      subset: e.subset,
      unicodeRange: e.unicodeRange,
      url: e.url,
    })),
    null,
    2
  )};
`;
  await writeFile(path.join(root, "src", "lib", "exporters", "font-files.ts"), filesTs);

  const dataTs = `// Generado por scripts/gen-fonts.mjs — no editar a mano.
// Base64 woff2 embebido en el PDF (render sin red en Vercel y local).
export interface FontData {
  family: string;
  style: string;
  weight: string;
  unicodeRange: string;
  base64: string;
}

export const FONTS_DATA: FontData[] = ${JSON.stringify(
    entries.map((e) => ({
      family: e.family,
      style: e.style,
      weight: weightOf(e),
      unicodeRange: e.unicodeRange,
      base64: e.base64,
    })),
    null,
    2
  )};
`;
  await writeFile(path.join(root, "src", "lib", "exporters", "fonts-data.ts"), dataTs);

  const ttfEntries = [];
  for (const e of entries) {
    if (e.subset !== "latin") continue;
    const woff2Buf = Buffer.from(e.base64, "base64");
    let ttfRaw;
    try {
      ttfRaw = await decompress(woff2Buf);
    } catch (err) {
      console.warn(`TTF ${e.filename} fallo: ${err instanceof Error ? err.message : err}`);
      continue;
    }
    const ttfBuf = Buffer.from(ttfRaw);
    if (ttfBuf.length < 4 || ttfBuf.readUInt32BE(0) !== 0x00010000) {
      console.warn(`TTF ${e.filename} no tiene magic 00010000, omitido`);
      continue;
    }
    ttfEntries.push({
      family: e.family,
      style: e.style,
      weight: weightOf(e),
      base64: ttfBuf.toString("base64"),
    });
    console.log(`TTF ${e.filename} -> ${ttfBuf.length} bytes`);
  }

  const ttfTs = `// Generado por scripts/gen-fonts.mjs — no editar a mano.
// Base64 TTF (solo subset latin) embebido en DOC/DOCX/ODT como fuente instalable.
export interface FontTtfData {
  family: string;
  style: string;
  weight: string;
  base64: string;
}

export const FONTS_TTF_DATA: FontTtfData[] = ${JSON.stringify(ttfEntries, null, 2)};
`;
  await writeFile(path.join(root, "src", "lib", "exporters", "fonts-ttf-data.ts"), ttfTs);

  for (const [family, dir] of Object.entries(OFL_DIRS)) {
    try {
      const res = await fetch(
        `https://raw.githubusercontent.com/google/fonts/main/ofl/${dir}/OFL.txt`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const slug = family.toLowerCase().replace(/[^a-z0-9]/g, "");
      await writeFile(path.join(root, "public", "fonts", `OFL-${slug}.txt`), await res.text());
      console.log(`OFL ${slug} OK`);
    } catch (e) {
      console.warn(`OFL ${family} fallo: ${e instanceof Error ? e.message : e}`);
    }
  }

  const total = entries.reduce((n, e) => n + e.base64.length, 0);
  const ttfTotal = ttfEntries.reduce((n, e) => n + e.base64.length, 0);
  console.log(
    `Listo: ${entries.length} woff2 (base64 ~${Math.round(total / 1024)}KB), ${ttfEntries.length} TTF (base64 ~${Math.round(ttfTotal / 1024)}KB)`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
