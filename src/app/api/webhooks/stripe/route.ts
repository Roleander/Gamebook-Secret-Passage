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
        const userId = session.metadata?.userId && session.metadata.userId !== "anonymous"
          ? session.metadata.userId
          : null;
        const planId = session.metadata?.planId;
        const message = session.metadata?.message;

        if (session.mode === "payment") {
          const stripePaymentId = session.payment_intent as string;

          // If planId exists, this is a one-time subscription (e.g., Lifetime)
          if (userId && planId) {
            const existingSub = await db.subscription.findFirst({
              where: { userId, planId, status: { in: ["active", "trialing"] } },
            });
            if (existingSub) break;

            const plan = await db.subscriptionPlan.findUnique({ where: { id: planId } });
            await db.subscription.create({
              data: {
                userId,
                planId,
                status: "active",
                stripeSubscriptionId: stripePaymentId,
                startDate: new Date(),
                endDate: plan?.interval === "one-time" ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              },
            });
            break;
          }

          // Otherwise, it's a donation
          const existing = await db.donation.findUnique({
            where: { stripePaymentId },
          });
          if (existing) break;

          await db.donation.create({
            data: {
              userId,
              amount: (session.amount_total || 0) / 100,
              currency: session.currency || "eur",
              paymentMethod: "stripe",
              stripePaymentId,
              status: "completed",
              message: message || null,
            },
          });
        }

        if (session.mode === "subscription" && userId && planId) {
          const stripeSubId = session.subscription as string;

          // Idempotency: skip if already recorded
          const existingSub = await db.subscription.findUnique({
            where: { stripeSubscriptionId: stripeSubId },
          });
          if (existingSub) break;

          const subscription = await getStripe().subscriptions.retrieve(stripeSubId);
          const periodEnd = (subscription as any).current_period_end
            || Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;

          await db.subscription.create({
            data: {
              userId,
              planId,
              status: "active",
              stripeSubscriptionId: stripeSubId,
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
          const periodEnd = (subscription as any).current_period_end
            || (subscription as any).items?.data?.[0]?.current_period_end;
          const statusMap: Record<string, string> = {
            active: "active",
            trialing: "trialing",
            past_due: "past_due",
            canceled: "canceled",
            unpaid: "past_due",
            incomplete: "past_due",
            incomplete_expired: "canceled",
            paused: "canceled",
          };
          await db.subscription.update({
            where: { id: dbSubscription.id },
            data: {
              status: statusMap[subscription.status] || "canceled",
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

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const paymentIntentId = charge.payment_intent as string;
        await db.donation.updateMany({
          where: { stripePaymentId: paymentIntentId },
          data: { status: "refunded" },
        });
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice & {
          subscription?: string | { id: string } | null;
          parent?: { subscription_details?: { subscription?: string | { id: string } | null } | null };
        };
        const stripeSubId =
          (typeof invoice.subscription === "string"
            ? invoice.subscription
            : invoice.subscription?.id) ??
          (typeof invoice.parent?.subscription_details?.subscription === "string"
            ? invoice.parent.subscription_details.subscription
            : invoice.parent?.subscription_details?.subscription?.id);
        if (stripeSubId && typeof stripeSubId === "string") {
          await db.subscription.updateMany({
            where: { stripeSubscriptionId: stripeSubId },
            data: { status: "active" },
          });
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice & {
          subscription?: string | { id: string } | null;
          parent?: { subscription_details?: { subscription?: string | { id: string } | null } | null };
        };
        const stripeSubId =
          (typeof invoice.subscription === "string"
            ? invoice.subscription
            : invoice.subscription?.id) ??
          (typeof invoice.parent?.subscription_details?.subscription === "string"
            ? invoice.parent.subscription_details.subscription
            : invoice.parent?.subscription_details?.subscription?.id);
        if (stripeSubId && typeof stripeSubId === "string") {
          await db.subscription.updateMany({
            where: { stripeSubscriptionId: stripeSubId },
            data: { status: "past_due" },
          });
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook error:", error);
    return NextResponse.json({ error: "Webhook error" }, { status: 500 });
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
