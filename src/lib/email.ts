export type EmailProvider = "resend" | "brevo" | "postmark" | "mailgun";

export function isEmailConfigured(): boolean {
  return Boolean(process.env.EMAIL_API_KEY && process.env.EMAIL_FROM);
}

export function resolveProvider(): EmailProvider {
  const raw = (process.env.EMAIL_PROVIDER || "").trim().toLowerCase();
  return raw === "brevo" || raw === "postmark" || raw === "mailgun" ? raw : "resend";
}

export function parseFromHeader(from: string): { email: string; name: string | null } {
  const angled = from.match(/^\s*"?([^"]*?)"?\s*<\s*([^<>]+)\s*>\s*$/);
  if (angled) {
    return { email: angled[2].trim(), name: angled[1].trim() || null };
  }
  return { email: from.trim(), name: null };
}

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

interface ProviderRequest {
  url: string;
  headers: Record<string, string>;
  body: string | URLSearchParams;
}

export function buildEmailRequest(
  provider: EmailProvider,
  apiKey: string,
  from: string,
  options: SendEmailOptions
): ProviderRequest {
  const override = (process.env.EMAIL_API_URL || "").replace(/\/+$/, "");

  switch (provider) {
    case "brevo": {
      const parsed = parseFromHeader(from);
      return {
        url: override || "https://api.brevo.com/v3/smtp/email",
        headers: { "Content-Type": "application/json", "api-key": apiKey },
        body: JSON.stringify({
          sender: {
            email: parsed.email,
            ...(parsed.name ? { name: parsed.name } : {}),
          },
          to: [{ email: options.to }],
          subject: options.subject,
          htmlContent: options.html,
          textContent: options.text,
        }),
      };
    }
    case "postmark":
      return {
        url: override || "https://api.postmarkapp.com/email",
        headers: {
          "Content-Type": "application/json",
          "X-Postmark-Server-Token": apiKey,
        },
        body: JSON.stringify({
          From: from,
          To: [options.to],
          Subject: options.subject,
          HtmlBody: options.html,
          TextBody: options.text,
        }),
      };
    case "mailgun": {
      const { email } = parseFromHeader(from);
      const domain = email.split("@")[1] || "example.com";
      const form = new URLSearchParams();
      form.set("from", from);
      form.set("to", options.to);
      form.set("subject", options.subject);
      form.set("html", options.html);
      form.set("text", options.text);
      return {
        url: override || `https://api.mailgun.net/v3/${domain}/messages`,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization:
            "Basic " + Buffer.from(`api:${apiKey}`).toString("base64"),
        },
        body: form,
      };
    }
    default:
      return {
        url: override || "https://api.resend.com/emails",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          from,
          to: [options.to],
          subject: options.subject,
          html: options.html,
          text: options.text,
        }),
      };
  }
}

export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  const apiKey = process.env.EMAIL_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) return false;

  const provider = resolveProvider();
  const request = buildEmailRequest(provider, apiKey, from, options);

  try {
    const res = await fetch(request.url, {
      method: "POST",
      headers: request.headers,
      body: request.body,
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error(`Email send failed (${provider} ${res.status}):`, detail.slice(0, 500));
      return false;
    }
    return true;
  } catch (error) {
    console.error("Email send error:", error);
    return false;
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string
): Promise<boolean> {
  const subject = "Restablece tu contraseña — Gamebook Secret Passage";
  const text = [
    "Restablece tu contraseña",
    "",
    "Has solicitado restablecer tu contraseña en Gamebook Secret Passage.",
    "Este enlace caduca en 1 hora:",
    "",
    resetUrl,
    "",
    "Si no has sido tú, ignora este correo: tu contraseña no cambiará.",
    "",
    "© 2026 Roleander Games",
  ].join("\n");

  const html = `<!DOCTYPE html>
<html lang="es">
<body style="margin:0;padding:0;background:#0f172a;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:520px;background:#1e293b;border-radius:12px;border:1px solid #334155;" cellpadding="0" cellspacing="0">
        <tr><td style="padding:28px 32px;">
          <h1 style="margin:0 0 12px;font-size:20px;color:#e2e8f0;">Restablece tu contraseña</h1>
          <p style="margin:0 0 20px;font-size:14px;color:#94a3b8;line-height:1.6;">
            Has solicitado restablecer tu contraseña en <strong style="color:#e2e8f0;">Gamebook Secret Passage</strong>.
            El enlace caduca en <strong style="color:#e2e8f0;">1 hora</strong>.
          </p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
            <tr><td style="background:#6366f1;border-radius:8px;">
              <a href="${escapeHtml(resetUrl)}" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">
                Restablecer contraseña
              </a>
            </td></tr>
          </table>
          <p style="margin:0 0 8px;font-size:12px;color:#64748b;line-height:1.6;">
            Si el botón no funciona, copia y pega este enlace en tu navegador:
            <br /><span style="word-break:break-all;color:#818cf8;">${escapeHtml(resetUrl)}</span>
          </p>
          <p style="margin:16px 0 0;font-size:12px;color:#64748b;line-height:1.6;">
            Si no has sido tú, ignora este correo: tu contraseña no cambiará.
          </p>
        </td></tr>
        <tr><td style="padding:16px 32px 24px;border-top:1px solid #334155;">
          <p style="margin:0;font-size:11px;color:#475569;">© 2026 Roleander Games · Gamebook Secret Passage</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return sendEmail({ to, subject, html, text });
}
