import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import Stripe from "stripe";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-08-26.dahlia",
  });
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json();
    const { amount, currency = "eur", message } = body;

    if (!amount || amount < 1) {
      return NextResponse.json({ error: "Cantidad mínima: 1 EUR" }, { status: 400 });
    }

    const origin = req.headers.get("origin") || "https://gamebook-secret-passage.vercel.app";

    const checkoutSession = await getStripe().checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: "Donación a Secret Passage",
              description: message || "Gracias por tu apoyo",
            },
            unit_amount: Math.round(amount * 100), // Stripe uses cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/profile?donated=true`,
      cancel_url: `${origin}/pricing`,
      metadata: {
        userId: session?.user ? (session.user as any).id : "anonymous",
        message: message || "",
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("Error creating Stripe checkout:", error);
    return NextResponse.json({ error: "Error al crear sesión de pago" }, { status: 500 });
  }
}
