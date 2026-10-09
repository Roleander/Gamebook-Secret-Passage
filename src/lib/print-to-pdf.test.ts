import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const setContent = vi.fn();
const pdf = vi.fn();
const close = vi.fn();
const launch = vi.fn();

vi.mock("puppeteer-core", () => ({ default: { launch: (...args: unknown[]) => launch(...args) } }));

import { htmlToPdf } from "@/lib/print-to-pdf";

beforeEach(() => {
  vi.stubEnv("CHROME_EXECUTABLE_PATH", "C:/fake/chrome.exe");
  launch.mockResolvedValue({ newPage: () => Promise.resolve({ setContent, pdf }), close });
  setContent.mockResolvedValue(undefined);
  pdf.mockResolvedValue(new Uint8Array([37, 80, 68, 70])); // %PDF
  close.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("print-to-pdf (htmlToPdf)", () => {
  it("genera un buffer PDF a partir del html", async () => {
    const buf = await htmlToPdf("<html><body>hola</body></html>");
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.subarray(0, 4).toString()).toBe("%PDF");
    expect(setContent).toHaveBeenCalledWith("<html><body>hola</body></html>", expect.anything());
    expect(pdf).toHaveBeenCalledWith(
      expect.objectContaining({
        printBackground: true,
        margin: { top: "0.4in", right: "0.4in", bottom: "0.4in", left: "0.4in" },
      })
    );
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("usa el ejecutable de CHROME_EXECUTABLE_PATH en local", async () => {
    await htmlToPdf("<html></html>");
    expect(launch).toHaveBeenCalledWith(
      expect.objectContaining({ executablePath: "C:/fake/chrome.exe", headless: true })
    );
  });

  it("propaga errores y cierra el navegador", async () => {
    setContent.mockRejectedValue(new Error("boom"));
    await expect(htmlToPdf("<html></html>")).rejects.toThrow("boom");
    expect(close).toHaveBeenCalledTimes(1);
  });
});
