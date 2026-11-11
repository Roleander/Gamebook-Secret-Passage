import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchIllustration,
  isAllowedIllustrationUrl,
  parseImageDimensions,
} from "@/lib/illustration";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function pngHeader(width: number, height: number): Buffer {
  const bytes = Buffer.alloc(24);
  bytes[0] = 0x89;
  bytes[1] = 0x50;
  bytes[2] = 0x4e;
  bytes[3] = 0x47;
  bytes[4] = 0x0d;
  bytes[5] = 0x0a;
  bytes[6] = 0x1a;
  bytes[7] = 0x0a;
  bytes.writeUInt32BE(width, 16);
  bytes.writeUInt32BE(height, 20);
  return bytes;
}

describe("isAllowedIllustrationUrl", () => {
  it("accepts Vercel Blob and same-origin relative URLs", () => {
    expect(
      isAllowedIllustrationUrl(
        "https://store.public.blob.vercel-storage.com/illustrations/u/p.png"
      )
    ).toBe(true);
    expect(isAllowedIllustrationUrl("/uploads/illustration.png")).toBe(true);
  });

  it("rejects unsupported schemes, credentials and unknown hosts", () => {
    expect(isAllowedIllustrationUrl("javascript:alert(1)")).toBe(false);
    expect(isAllowedIllustrationUrl("data:image/png;base64,AAAA")).toBe(false);
    expect(isAllowedIllustrationUrl("https://example.com/art.png")).toBe(false);
    expect(
      isAllowedIllustrationUrl(
        "https://user:pass@store.public.blob.vercel-storage.com/a.png"
      )
    ).toBe(false);
  });

  it("accepts explicitly allowed hosts", () => {
    vi.stubEnv("ILLUSTRATION_ALLOWED_HOSTS", "cdn.example.com,.images.example.org");
    expect(isAllowedIllustrationUrl("https://cdn.example.com/a.png")).toBe(true);
    expect(isAllowedIllustrationUrl("https://media.images.example.org/a.png")).toBe(true);
    expect(isAllowedIllustrationUrl("https://other.example.com/a.png")).toBe(false);
  });
});

describe("parseImageDimensions", () => {
  it("reads PNG dimensions", () => {
    expect(parseImageDimensions(pngHeader(640, 480), "image/png")).toEqual({
      width: 640,
      height: 480,
    });
  });

  it("reads SVG viewBox dimensions", () => {
    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200"></svg>',
      "utf8"
    );
    expect(parseImageDimensions(svg, "image/svg+xml")).toEqual({
      width: 320,
      height: 200,
    });
  });

  it("falls back to a sane size for unknown images", () => {
    expect(parseImageDimensions(Buffer.from("nope"), "image/png")).toEqual({
      width: 1200,
      height: 800,
    });
  });
});

describe("fetchIllustration", () => {
  it("downloads and validates an allowed image", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(new Uint8Array(pngHeader(300, 150)), {
        status: 200,
        headers: { "Content-Type": "image/png" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const image = await fetchIllustration(
      "https://store.public.blob.vercel-storage.com/illustrations/p1.png"
    );
    expect(image).toMatchObject({
      mime: "image/png",
      ext: "png",
      width: 300,
      height: 150,
    });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("does not fetch untrusted URLs", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(fetchIllustration("https://example.com/a.png")).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
