"use client";

import { useState } from "react";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { Button } from "@/components/ui/button";

interface PayPalDonateProps {
  amount?: number;
  onSuccess?: () => void;
}

export function PayPalDonate({ amount = 5, onSuccess }: PayPalDonateProps) {
  const [sdkReady, setSdkReady] = useState(false);

  if (!process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID) {
    return (
      <Button variant="outline" disabled>
        PayPal no configurado
      </Button>
    );
  }

  return (
    <PayPalScriptProvider
      options={{
        clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID,
        currency: "EUR",
      }}
    >
      <div className="w-full">
        <PayPalButtons
          style={{ layout: "vertical", color: "blue" }}
          createOrder={(data, actions) => {
            return actions.order.create({
              intent: "CAPTURE",
              purchase_units: [
                {
                  amount: { value: amount.toString(), currency_code: "EUR" },
                  description: "Donación a Secret Passage",
                },
              ],
            });
          }}
          onApprove={async (data, actions) => {
            const details = await actions.order!.capture();
            // Record donation
            try {
              await fetch("/api/donations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  amount,
                  currency: "EUR",
                  paymentMethod: "paypal",
                  paypalOrderId: details.id,
                }),
              });
            } catch (error) {
              console.error("Error recording donation:", error);
            }
            alert(`¡Gracias por tu donación de ${amount} EUR, ${details.payer?.name?.given_name}!`);
            onSuccess?.();
          }}
          onError={(err) => {
            console.error("PayPal error:", err);
            alert("Error al procesar el pago con PayPal");
          }}
        />
      </div>
    </PayPalScriptProvider>
  );
}
