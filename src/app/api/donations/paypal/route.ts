import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";

const PAYPAL_API = "https://api-m.paypal.com";
const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
const PAYPAL_SECRET = process.env.PAYPAL_SECRET;

async function getPayPalAccessToken(): Promise<string> {
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString("base64");
  const res = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`PayPal auth failed: ${res.status}`);
  const data = await res.json();
  return data.access_token;
}

async function verifyPayPalOrder(orderId: string) {
  const token = await getPayPalAccessToken();
  const res = await fetch(`${PAYPAL_API}/v2/checkout/orders/${orderId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return res.json();
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json();
    const { orderId, amount, message } = body;

    if (!orderId) {
      return NextResponse.json({ error: "orderId requerido" }, { status: 400 });
    }

    if (!PAYPAL_SECRET) {
      return NextResponse.json({ error: "PayPal no configurado" }, { status: 500 });
    }

    const order = await verifyPayPalOrder(orderId);
    if (!order) {
      return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
    }

    if (order.status !== "COMPLETED") {
      return NextResponse.json({ error: "Orden no completada" }, { status: 400 });
    }

    // Extract amount from PayPal order
    const paypalAmount = parseFloat(order.purchase_units?.[0]?.amount?.value || "0");

    // Idempotency: skip if already recorded
    const existing = await db.donation.findUnique({
      where: { paypalOrderId: orderId },
    });
    if (existing) {
      return NextResponse.json({ donation: existing, alreadyRecorded: true });
    }

    const donation = await db.donation.create({
      data: {
        userId: session?.user ? (session.user as any).id : null,
        amount: paypalAmount || amount || 0,
        currency: order.purchase_units?.[0]?.amount?.currency_code || "EUR",
        paymentMethod: "paypal",
        paypalOrderId: orderId,
        status: "completed",
        message: message || null,
      },
    });

    return NextResponse.json({ donation });
  } catch (error) {
    console.error("PayPal verification error:", error);
    return NextResponse.json({ error: "Error al verificar el pago" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
