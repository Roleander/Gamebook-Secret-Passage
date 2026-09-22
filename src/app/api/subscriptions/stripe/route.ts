import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
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
    const { planId } = body;

    if (!planId) {
      return NextResponse.json({ error: "planId requerido" }, { status: 400 });
    }

    const plan = await db.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!plan) {
      return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 });
    }

    // Check if user already has active subscription
    const userId = (session.user as any).id;
    const existing = await db.subscription.findFirst({
      where: { userId, status: { in: ["active", "trialing"] } },
    });
    if (existing) {
      return NextResponse.json({ error: "Ya tienes una suscripción activa" }, { status: 400 });
    }

    // Get or create Stripe customer
    const user = await db.user.findUnique({ where: { id: userId } });
    let customerId = user?.stripeCustomerId;

    if (!customerId) {
      const customer = await getStripe().customers.create({
        email: user!.email,
        name: user!.name || undefined,
        metadata: { userId },
      });
      customerId = customer.id;
      await db.user.update({
        where: { id: userId },
        data: { stripeCustomerId: customerId },
      });
    }

    const origin = req.headers.get("origin") || "https://gamebook-secret-passage.vercel.app";

    // Determine Stripe price based on interval
    const isYearly = plan.interval === "year";
    const interval = isYearly ? "year" : "month";

    const checkoutSession = await getStripe().checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: plan.currency.toLowerCase(),
            product_data: {
              name: plan.displayName,
              description: plan.description || `Suscripción ${plan.displayName}`,
            },
            unit_amount: Math.round(plan.price * 100),
            recurring: { interval },
          },
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${origin}/profile?subscribed=true`,
      cancel_url: `${origin}/pricing`,
      metadata: {
        userId,
        planId,
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("Error creating Stripe subscription:", error);
    return NextResponse.json({ error: "Error al crear suscripción" }, { status: 500 });
  }
}
