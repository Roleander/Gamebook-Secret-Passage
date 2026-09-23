"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CreditCard } from "lucide-react";

interface StripeCheckoutProps {
  type: "donation" | "subscription" | "one-time-subscription";
  planId?: string;
  amount?: number;
  label?: string;
}

export function StripeCheckout({ type, planId, amount, label }: StripeCheckoutProps) {
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    setLoading(true);
    try {
      let url: string | null = null;

      if (type === "donation") {
        const response = await fetch("/api/donations/stripe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: amount || 5, message: "Donación a Secret Passage" }),
        });
        const data = await response.json();
        if (!response.ok) {
          alert(`Error: ${data.error || "Error al procesar el pago"}`);
          return;
        }
        url = data.url;
      } else if (type === "subscription" && planId) {
        const response = await fetch("/api/subscriptions/stripe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planId }),
        });
        const data = await response.json();
        if (!response.ok) {
          alert(`Error: ${data.error || "Error al procesar el pago"}`);
          return;
        }
        url = data.url;
      } else if (type === "one-time-subscription" && planId) {
        const response = await fetch("/api/subscriptions/stripe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planId }),
        });
        const data = await response.json();
        if (!response.ok) {
          alert(`Error: ${data.error || "Error al procesar el pago"}`);
          return;
        }
        url = data.url;
      }

      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error de conexión al procesar el pago");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleCheckout}
      disabled={loading}
      className="w-full"
      variant="outline"
    >
      <CreditCard className="w-4 h-4 mr-2" />
      {loading ? "Procesando..." : label || "Pagar con Stripe"}
    </Button>
  );
}
