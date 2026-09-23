"use client";

import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { Button } from "@/components/ui/button";

interface PayPalDonateProps {
  amount?: number;
  onSuccess?: () => void;
}

export function PayPalDonate({ amount = 5, onSuccess }: PayPalDonateProps) {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;

  if (!clientId) {
    return (
      <Button variant="outline" disabled className="w-full">
        PayPal no configurado
      </Button>
    );
  }

  return (
    <PayPalScriptProvider
      options={{
        clientId,
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
            try {
              // Server-side verification before recording
              const response = await fetch("/api/donations/paypal", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  orderId: data.orderID,
                  amount,
                }),
              });

              if (response.ok) {
                alert(`¡Gracias por tu donación de ${amount} EUR!`);
                onSuccess?.();
              } else {
                const err = await response.json().catch(() => ({}));
                alert(`Error al registrar la donación: ${err.error || "Error desconocido"}`);
              }
            } catch (error) {
              console.error("Error verifying PayPal donation:", error);
              alert("Error al verificar el pago con PayPal");
            }
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
