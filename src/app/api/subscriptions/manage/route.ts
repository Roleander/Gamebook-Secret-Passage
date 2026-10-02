import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { getStripe, cancelSubscriptionAtProvider } from "@/lib/billing";
import { SITE_URL } from "@/lib/site-url";

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

    const origin = process.env.NEXTAUTH_URL || SITE_URL;

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

    // Cancel at Stripe/PayPal first (best-effort)
    await cancelSubscriptionAtProvider(subscription);

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
