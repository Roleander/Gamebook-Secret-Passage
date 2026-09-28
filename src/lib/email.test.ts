import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildEmailRequest,
  isEmailConfigured,
  parseFromHeader,
  resolveProvider,
  sendEmail,
} from "@/lib/email";

const options = {
  to: "user@example.com",
  subject: "Asunto",
  html: "<p>hola</p>",
  text: "hola",
};

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("EMAIL_API_KEY", "test-key");
  vi.stubEnv("EMAIL_FROM", "Gamebook <no-reply@mi-dominio.com>");
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(new Response("{}", { status: 200 }));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("resolveProvider", () => {
  it("defaults to resend", () => {
    vi.stubEnv("EMAIL_PROVIDER", "");
    expect(resolveProvider()).toBe("resend");
  });

  it("accepts the known providers and rejects unknown ones", () => {
    for (const p of ["brevo", "postmark", "mailgun"] as const) {
      vi.stubEnv("EMAIL_PROVIDER", p);
      expect(resolveProvider()).toBe(p);
    }
    vi.stubEnv("EMAIL_PROVIDER", "smtp");
    expect(resolveProvider()).toBe("resend");
  });
});

describe("parseFromHeader", () => {
  it("splits name and address", () => {
    expect(parseFromHeader('Gamebook <no-reply@dom.com>')).toEqual({
      email: "no-reply@dom.com",
      name: "Gamebook",
    });
  });

  it("handles bare addresses", () => {
    expect(parseFromHeader("no-reply@dom.com")).toEqual({
      email: "no-reply@dom.com",
      name: null,
    });
  });
});

describe("buildEmailRequest", () => {
  it("resend: Bearer + JSON with to array", () => {
    const req = buildEmailRequest("resend", "re_1", "A <a@b.co>", options);
    expect(req.url).toBe("https://api.resend.com/emails");
    expect(req.headers.Authorization).toBe("Bearer re_1");
    expect(JSON.parse(req.body as string)).toMatchObject({
      from: "A <a@b.co>",
      to: ["user@example.com"],
      subject: "Asunto",
      html: "<p>hola</p>",
      text: "hola",
    });
  });

  it("brevo: api-key header + sender object + htmlContent", () => {
    const req = buildEmailRequest("brevo", "xkeys", "Gamebook <a@b.co>", options);
    expect(req.url).toBe("https://api.brevo.com/v3/smtp/email");
    expect(req.headers["api-key"]).toBe("xkeys");
    expect(req.headers.Authorization).toBeUndefined();
    expect(JSON.parse(req.body as string)).toMatchObject({
      sender: { email: "a@b.co", name: "Gamebook" },
      to: [{ email: "user@example.com" }],
      htmlContent: "<p>hola</p>",
      textContent: "hola",
    });
  });

  it("postmark: X-Postmark-Server-Token + PascalCase fields", () => {
    const req = buildEmailRequest("postmark", "pm-token", "A <a@b.co>", options);
    expect(req.url).toBe("https://api.postmarkapp.com/email");
    expect(req.headers["X-Postmark-Server-Token"]).toBe("pm-token");
    expect(JSON.parse(req.body as string)).toMatchObject({
      From: "A <a@b.co>",
      To: ["user@example.com"],
      Subject: "Asunto",
      HtmlBody: "<p>hola</p>",
      TextBody: "hola",
    });
  });

  it("mailgun: Basic auth api:key + form body + domain-scoped URL", () => {
    const req = buildEmailRequest("mailgun", "key-123", "A <no-reply@mi-dom.com>", options);
    expect(req.url).toBe("https://api.mailgun.net/v3/mi-dom.com/messages");
    expect(req.headers.Authorization).toBe(
      "Basic " + Buffer.from("api:key-123").toString("base64")
    );
    const form = req.body as URLSearchParams;
    expect(form.get("from")).toBe("A <no-reply@mi-dom.com>");
    expect(form.get("to")).toBe("user@example.com");
    expect(form.get("html")).toBe("<p>hola</p>");
  });

  it("honors EMAIL_API_URL override", () => {
    vi.stubEnv("EMAIL_API_URL", "https://api.eu.mailgun.net/v3/mi-dom.com/messages");
    const req = buildEmailRequest("mailgun", "k", "a@b.co", options);
    expect(req.url).toBe("https://api.eu.mailgun.net/v3/mi-dom.com/messages");
  });
});

describe("sendEmail", () => {
  it("returns true on 2xx", async () => {
    fetchMock.mockResolvedValueOnce(new Response("{}", { status: 200 }));
    expect(await sendEmail(options)).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns false on provider error", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response("bad request", { status: 422 })
    );
    expect(await sendEmail(options)).toBe(false);
  });

  it("returns false on network failure", async () => {
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    expect(await sendEmail(options)).toBe(false);
  });

  it("returns false without credentials and skips fetch", async () => {
    vi.stubEnv("EMAIL_API_KEY", "");
    expect(await sendEmail(options)).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(isEmailConfigured()).toBe(false);
  });

  it("isEmailConfigured reflects env state", () => {
    expect(isEmailConfigured()).toBe(true);
  });
});
