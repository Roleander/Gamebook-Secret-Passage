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

// GET - Get user's current subscription
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const subscription = await db.subscription.findFirst({
      where: {
        userId: (session.user as any).id,
        status: { in: ["active", "trialing"] },
      },
      include: {
        plan: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(subscription || null);
  } catch (error) {
    console.error("Error fetching subscription:", error);
    return NextResponse.json(
      { error: "Error al obtener suscripción" },
      { status: 500 }
    );
  }
}

// POST - Create Stripe Billing Portal session (for managing/canceling)
export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const user = await db.user.findUnique({ where: { id: userId } });

    if (!user?.stripeCustomerId) {
      return NextResponse.json(
        { error: "No tienes cuenta de Stripe" },
        { status: 400 }
      );
    }

    const origin = process.env.NEXTAUTH_URL || "https://gamebook-secret-passage.vercel.app";

    const portalSession = await getStripe().billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${origin}/profile`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error("Error creating portal session:", error);
    return NextResponse.json(
      { error: "Error al crear sesión de gestión" },
      { status: 500 }
    );
  }
}

// DELETE - Cancel subscription (cancels at Stripe first)
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const subscription = await db.subscription.findFirst({
      where: {
        userId: (session.user as any).id,
        status: { in: ["active", "trialing"] },
      },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: "No tienes suscripción activa" },
        { status: 404 }
      );
    }

    // Cancel at Stripe if it's a Stripe subscription
    if (subscription.stripeSubscriptionId && !subscription.stripeSubscriptionId.startsWith("pi_")) {
      try {
        await getStripe().subscriptions.cancel(subscription.stripeSubscriptionId);
      } catch (stripeError) {
        console.error("Stripe cancel error:", stripeError);
        // Continue with DB cancel even if Stripe fails
      }
    }

    // Cancel at PayPal if it's a PayPal subscription
    if (subscription.paypalSubscriptionId) {
      try {
        const auth = Buffer.from(
          `${process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID}:${process.env.PAYPAL_SECRET}`
        ).toString("base64");
        const tokenRes = await fetch("https://api-m.paypal.com/v1/oauth2/token", {
          method: "POST",
          headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: "grant_type=client_credentials",
        });
        const { access_token } = await tokenRes.json();
        await fetch(
          `https://api-m.paypal.com/v1/billing/subscriptions/${subscription.paypalSubscriptionId}/cancel`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${access_token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ reason: "Canceled by user" }),
          }
        );
      } catch (paypalError) {
        console.error("PayPal cancel error:", paypalError);
      }
    }

    const updated = await db.subscription.update({
      where: { id: subscription.id },
      data: {
        status: "canceled",
        canceledAt: new Date(),
      },
      include: {
        plan: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error canceling subscription:", error);
    return NextResponse.json(
      { error: "Error al cancelar suscripción" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
