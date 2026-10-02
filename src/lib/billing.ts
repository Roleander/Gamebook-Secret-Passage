import Stripe from "stripe";

const STRIPE_API_VERSION = "2026-08-26.dahlia";

export function getStripe(): Stripe {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: STRIPE_API_VERSION,
  });
}

export async function cancelSubscriptionAtProvider(subscription: {
  stripeSubscriptionId?: string | null;
  paypalSubscriptionId?: string | null;
}): Promise<void> {
  if (
    subscription.stripeSubscriptionId &&
    !subscription.stripeSubscriptionId.startsWith("pi_")
  ) {
    try {
      await getStripe().subscriptions.cancel(subscription.stripeSubscriptionId);
    } catch (stripeError) {
      console.error("Stripe cancel error:", stripeError);
    }
  }

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
}
