import { NextResponse } from "next/server";
import { lookup } from "dns/promises";
import Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sanitize(msg: string): string {
  return msg
    .replace(/sk_(live|test)_[A-Za-z0-9]+/g, "sk_***")
    .replace(/whsec_[A-Za-z0-9]+/g, "whsec_***")
    .replace(/pk_(live|test)_[A-Za-z0-9]+/g, "pk_***");
}

export async function GET(req: Request) {
  const dryRun = new URL(req.url).searchParams.get("dryRun") === "1";
  const result: Record<string, unknown> = { ts: new Date().toISOString() };

  const key = process.env.STRIPE_SECRET_KEY;
  result.env = {
    secretKeySet: !!key,
    secretKeyPrefix: key ? key.slice(0, 8) : null,
    webhookSecretSet: !!process.env.STRIPE_WEBHOOK_SECRET,
  };

  try {
    const addrs = await lookup("api.stripe.com", { all: true });
    result.dns = {
      ok: true,
      addresses: addrs.map((a) => `${a.address} (IPv${a.family})`),
    };
  } catch (e) {
    result.dns = { ok: false, error: sanitize((e as Error).message) };
  }

  try {
    const res = await fetch("https://api.stripe.com/v1/balance", {
      headers: { Authorization: `Bearer ${key ?? ""}` },
      signal: AbortSignal.timeout(15000),
    });
    let stripeErrorType: string | null = null;
    if (!res.ok) {
      try {
        const j = (await res.json()) as { error?: { type?: string } };
        stripeErrorType = j?.error?.type ?? null;
      } catch {
        // ignore
      }
    }
    // 200 = red + clave correctas; 401 = se llegó a Stripe pero clave inválida
    result.rawFetch = { ok: true, status: res.status, stripeErrorType };
  } catch (e) {
    const err = e as Error & { cause?: unknown };
    result.rawFetch = {
      ok: false,
      error: sanitize(err.message),
      cause: err.cause ? sanitize(String(err.cause)) : null,
    };
  }

  try {
    const stripe = new Stripe(key ?? "", { apiVersion: "2026-08-26.dahlia" });
    await stripe.balance.retrieve();
    // Solo éxito: no se devuelve ningún dato del saldo
    result.sdk = { ok: true };

    // Endpoints webhook configurados en la cuenta (sin secretos)
    try {
      const eps = await stripe.webhookEndpoints.list({ limit: 10 });
      result.webhookEndpoints = eps.data.map((e) => ({
        url: e.url,
        status: e.status,
        events: e.enabled_events.slice(0, 8),
      }));
    } catch (e) {
      const err = e as { type?: string; message?: string };
      result.webhookEndpoints = {
        error: sanitize(err.message ?? String(e)),
        type: err.type ?? null,
      };
    }

    // Dry-run opcional (?dryRun=1): crea y expira una sesión de suscripción
    // — la llamada exacta que fallaba con StripeConnectionError
    if (dryRun) {
      try {
        const cs = await stripe.checkout.sessions.create({
          payment_method_types: ["card"],
          line_items: [
            {
              price_data: {
                currency: "eur",
                product_data: { name: "Ping test (no se cobra)" },
                unit_amount: 500,
                recurring: { interval: "month" },
              },
              quantity: 1,
            },
          ],
          mode: "subscription",
          success_url: "https://gamebook-secret-passage.vercel.app/",
          cancel_url: "https://gamebook-secret-passage.vercel.app/",
        });
        await stripe.checkout.sessions.expire(cs.id);
        result.checkoutDryRun = { ok: true, sessionId: cs.id, expired: true };
      } catch (e) {
        const err = e as {
          type?: string;
          code?: string | null;
          message?: string;
          statusCode?: number;
        };
        result.checkoutDryRun = {
          ok: false,
          type: err.type ?? null,
          code: err.code ?? null,
          httpStatus: err.statusCode ?? null,
          message: sanitize(err.message ?? String(e)),
        };
      }
    }
  } catch (e) {
    const err = e as {
      type?: string;
      code?: string | null;
      message?: string;
      statusCode?: number;
    };
    result.sdk = {
      ok: false,
      type: err.type ?? null,
      code: err.code ?? null,
      httpStatus: err.statusCode ?? null,
      message: sanitize(err.message ?? String(e)),
    };
  }

  try {
    const res = await fetch(
      "https://gamebook-secret-passage.vercel.app/api/webhooks/stripe",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "stripe-signature": "t=1,v1=bad",
        },
        body: "{}",
        signal: AbortSignal.timeout(15000),
      }
    );
    const text = await res.text();
    result.webhookRoute = { status: res.status, body: sanitize(text).slice(0, 120) };
  } catch (e) {
    result.webhookRoute = { error: sanitize((e as Error).message) };
  }

  return NextResponse.json(result);
}
