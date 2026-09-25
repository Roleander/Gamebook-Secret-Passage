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
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { amount, message } = body;
    const currency = "eur";

    if (typeof amount !== "number" || !Number.isFinite(amount)) {
      return NextResponse.json({ error: "Cantidad no válida" }, { status: 400 });
    }
    if (amount < 1 || amount > 500) {
      return NextResponse.json(
        { error: "Cantidad entre 1 y 500 EUR" },
        { status: 400 }
      );
    }

    const safeMessage =
      typeof message === "string" ? message.slice(0, 500) : "";

    const origin = req.headers.get("origin") || "https://gamebook-secret-passage.vercel.app";

    const checkoutSession = await getStripe().checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: "Donación a Secret Passage",
              description: safeMessage || "Gracias por tu apoyo",
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
        userId: (session.user as any).id,
        message: safeMessage,
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("Error creating Stripe checkout:", error);
    const detail =
      error instanceof Error
        ? error.message
        : typeof error === "object" && error && "message" in error
          ? String((error as { message: unknown }).message)
          : undefined;
    return NextResponse.json(
      { error: "Error al crear sesión de pago", detail },
      { status: 500 }
    );
  }
}
