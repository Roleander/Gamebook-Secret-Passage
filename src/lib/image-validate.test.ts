import { describe, expect, it } from "vitest";
import {
  detectImageMime,
  sanitizeSvg,
} from "@/lib/image-validate";

const bytes = (...values: number[]) => new Uint8Array(values);
const text = (s: string) => new TextEncoder().encode(s);

describe("detectImageMime", () => {
  it("detects JPEG magic bytes", () => {
    expect(detectImageMime(bytes(0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0))).toBe(
      "image/jpeg"
    );
  });

  it("detects PNG magic bytes", () => {
    expect(
      detectImageMime(
        bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0)
      )
    ).toBe("image/png");
  });

  it("detects WebP magic bytes", () => {
    const webp = new Uint8Array(16);
    webp.set(text("RIFF"), 0);
    webp.set(text("WEBP"), 8);
    expect(detectImageMime(webp)).toBe("image/webp");
  });

  it("detects SVG by content", () => {
    expect(detectImageMime(text('<svg xmlns="http://www.w3.org/2000/svg"/>'))).toBe(
      "image/svg+xml"
    );
    expect(
      detectImageMime(text('<?xml version="1.0"?>\n<svg xmlns="x"></svg>'))
    ).toBe("image/svg+xml");
  });

  it("rejects unknown content", () => {
    expect(detectImageMime(text("MZ this is not an image"))).toBeNull();
    expect(detectImageMime(bytes())).toBeNull();
  });

  it("does not mistake PHP/JS payloads for images", () => {
    expect(detectImageMime(text("<?php system($_GET['x']); ?>"))).not.toBe(
      "image/svg+xml"
    );
  });
});

describe("sanitizeSvg", () => {
  it("keeps drawing elements and attributes", () => {
    const input =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path d="M0 0L10 10" fill="red" stroke-width="2"/></svg>';
    const out = sanitizeSvg(input);
    expect(out).toContain("<path");
    expect(out).toContain('viewBox="0 0 10 10"');
    expect(out).toContain('fill="red"');
  });

  it("preserves camelCase tags like linearGradient and clipPath", () => {
    const input =
      "<svg><defs><linearGradient id=\"g\"><stop offset=\"0\" stop-color=\"red\"/></linearGradient></defs><clipPath id=\"c\"><rect x=\"0\" y=\"0\" width=\"5\" height=\"5\"/></clipPath></svg>";
    const out = sanitizeSvg(input);
    expect(out).toContain("<linearGradient");
    expect(out).toContain("<clipPath");
  });

  it("removes script tags with content", () => {
    const out = sanitizeSvg(
      '<svg><script>alert(document.cookie)</script><rect width="1" height="1"/></svg>'
    );
    expect(out).not.toContain("<script");
    expect(out).not.toContain("alert(document.cookie)");
    expect(out).toContain("<rect");
  });

  it("removes event handlers", () => {
    const out = sanitizeSvg(
      '<svg onload="alert(1)"><rect onmouseover="alert(2)" width="1" height="1"/></svg>'
    );
    expect(out).not.toContain("onload");
    expect(out).not.toContain("onmouseover");
  });

  it("removes javascript: urls and href-like attributes", () => {
    const out = sanitizeSvg(
      '<svg><a href="javascript:alert(1)"><text>x</text></a><image href="https://evil.example/x.png"/></svg>'
    );
    expect(out).not.toContain("javascript:");
    expect(out).not.toContain("evil.example");
    expect(out).not.toContain("<image");
    expect(out).not.toContain("<a ");
  });

  it("removes foreignObject, use and animate", () => {
    const out = sanitizeSvg(
      '<svg><foreignObject><body xmlns="http://www.w3.org/1999/xhtml"><img src=x onerror=alert(1)/></body></foreignObject><use href="#x"/><animate attributeName="href" values="javascript:alert(1)"/></svg>'
    );
    expect(out).not.toContain("foreignObject");
    expect(out).not.toContain("<use");
    expect(out).not.toContain("<animate");
    expect(out).not.toContain("onerror");
  });

  it("drops style declarations with url() or unknown properties", () => {
    const out = sanitizeSvg(
      '<svg style="fill: url(https://evil.example/t.png); background: expression(alert(1))"><rect style="fill: blue" width="1" height="1"/></svg>'
    );
    expect(out).not.toContain("evil.example");
    expect(out).not.toContain("expression");
    expect(out).toMatch(/fill:\s*blue/);
  });

  it("keeps svg root with xmlns so standalone files render", () => {
    const out = sanitizeSvg(
      '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>'
    );
    expect(out).toContain("<svg");
    expect(out).toContain('xmlns="http://www.w3.org/2000/svg"');
  });
});
