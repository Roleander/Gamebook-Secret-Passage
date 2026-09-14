import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";

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

// POST - Create new subscription
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { planId, paypalSubscriptionId } = await req.json();

    // Check if plan exists
    const plan = await db.subscriptionPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 });
    }

    // Check if user already has active subscription
    const existing = await db.subscription.findFirst({
      where: {
        userId: (session.user as any).id,
        status: { in: ["active", "trialing"] },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Ya tienes una suscripción activa" },
        { status: 400 }
      );
    }

    // Calculate end date
    const startDate = new Date();
    const endDate = new Date();
    if (plan.interval === "month") {
      endDate.setMonth(endDate.getMonth() + 1);
    } else if (plan.interval === "year") {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }

    const subscription = await db.subscription.create({
      data: {
        userId: (session.user as any).id,
        planId,
        paypalSubscriptionId,
        status: "active",
        startDate,
        endDate: plan.interval === "one-time" ? null : endDate,
      },
      include: {
        plan: true,
      },
    });

    return NextResponse.json(subscription);
  } catch (error) {
    console.error("Error creating subscription:", error);
    return NextResponse.json(
      { error: "Error al crear suscripción" },
      { status: 500 }
    );
  }
}

// DELETE - Cancel subscription
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

    // Update subscription status
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

    // TODO: Cancel PayPal subscription via API

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error canceling subscription:", error);
    return NextResponse.json(
      { error: "Error al cancelar suscripción" },
      { status: 500 }
    );
  }
}
