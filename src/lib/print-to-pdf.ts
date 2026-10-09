import fs from "node:fs";
import puppeteer from "puppeteer-core";

const WINDOWS_CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

function localChromePath(): string | null {
  if (process.env.CHROME_EXECUTABLE_PATH) return process.env.CHROME_EXECUTABLE_PATH;
  if (process.platform === "win32" && fs.existsSync(WINDOWS_CHROME)) return WINDOWS_CHROME;
  return null;
}

export async function htmlToPdf(html: string): Promise<Buffer> {
  const local = localChromePath();

  let executablePath: string;
  let args: string[];
  if (local) {
    executablePath = local;
    args = ["--no-sandbox", "--disable-dev-shm-usage"];
  } else {
    const chromium = (await import("@sparticuz/chromium")).default;
    executablePath = await chromium.executablePath();
    args = chromium.args;
  }

  const browser = await puppeteer.launch({
    executablePath,
    args,
    headless: true,
    protocolTimeout: 20000,
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load", timeout: 10000 });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      displayHeaderFooter: false,
      margin: { top: "0.4in", right: "0.4in", bottom: "0.4in", left: "0.4in" },
      timeout: 10000,
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close().catch(() => {});
  }
}
