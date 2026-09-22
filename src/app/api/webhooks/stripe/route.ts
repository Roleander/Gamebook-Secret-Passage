import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import Stripe from "stripe";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-08-26.dahlia",
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const sig = req.headers.get("stripe-signature");

    if (!sig) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    let event: Stripe.Event;
    try {
      event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const planId = session.metadata?.planId;

        if (session.mode === "payment" && userId) {
          // One-time donation
          await db.donation.create({
            data: {
              userId,
              amount: (session.amount_total || 0) / 100,
              currency: session.currency || "eur",
              paymentMethod: "stripe",
              stripePaymentId: session.payment_intent as string,
              status: "completed",
            },
          });
        }

        if (session.mode === "subscription" && userId && planId) {
          // Subscription created
          const subscription = await getStripe().subscriptions.retrieve(
            session.subscription as string
          );

          const periodEnd = (subscription as any).current_period_end || Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;

          await db.subscription.create({
            data: {
              userId,
              planId,
              status: "active",
              stripeSubscriptionId: subscription.id,
              startDate: new Date(),
              endDate: new Date(periodEnd * 1000),
            },
          });
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const dbSubscription = await db.subscription.findFirst({
          where: { stripeSubscriptionId: subscription.id },
        });

        if (dbSubscription) {
          const periodEnd = (subscription as any).current_period_end;
          await db.subscription.update({
            where: { id: dbSubscription.id },
            data: {
              status: subscription.status === "active" ? "active" :
                      subscription.status === "past_due" ? "past_due" : "canceled",
              ...(periodEnd ? { endDate: new Date(periodEnd * 1000) } : {}),
            },
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await db.subscription.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: {
            status: "canceled",
            canceledAt: new Date(),
          },
        });
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook error:", error);
    return NextResponse.json({ error: "Webhook error" }, { status: 500 });
  }
}

// Use raw body for webhook signature verification
export const runtime = "nodejs";
