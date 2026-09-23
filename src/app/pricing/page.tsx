"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Check, Heart, Zap, Crown } from "lucide-react";
import { PayPalDonate } from "@/components/paypal-donate";
import { StripeCheckout } from "@/components/stripe-checkout";
import Link from "next/link";

interface Plan {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  price: number;
  currency: string;
  interval: string;
  features: string[];
  maxProjects: number | null;
  maxPassages: number | null;
}

export default function PricingPage() {
  const [plans, setPlans] = useState<Plan[]>([]);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await fetch("/api/subscriptions");
      if (response.ok) {
        const data = await response.json();
        setPlans(data);
      }
    } catch (error) {
      console.error("Error fetching plans:", error);
    }
  };

  // Default plans if none in database
  const displayPlans = plans.length > 0 ? plans : [
    {
      id: "free",
      name: "free",
      displayName: "Gratis",
      description: "Para empezar a crear",
      price: 0,
      currency: "EUR",
      interval: "month",
      features: [
        "3 proyectos",
        "500 pasajes por proyecto",
        "Exportar TXT",
        "Detección de enlaces básica",
      ],
      maxProjects: 3,
      maxPassages: 500,
    },
    {
      id: "pro",
      name: "pro",
      displayName: "Pro",
      description: "Para autores serios",
      price: 9.99,
      currency: "EUR",
      interval: "month",
      features: [
        "Proyectos ilimitados",
        "Pasajes ilimitados",
        "Exportar PDF, EPUB, ODT, DOC, DOCX",
        "Auto-fix avanzado",
        "Agentes de IA",
        "Barajar contenido",
        "Soporte prioritario",
      ],
      maxProjects: null,
      maxPassages: null,
    },
    {
      id: "lifetime",
      name: "lifetime",
      displayName: "De por vida",
      description: "Pago único, acceso para siempre",
      price: 49,
      currency: "EUR",
      interval: "one-time",
      features: [
        "Todo lo de Pro",
        "Acceso de por vida",
        "Actualizaciones incluidas",
        "Acceso anticipado a funciones",
      ],
      maxProjects: null,
      maxPassages: null,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-primary mb-4">
            Planes y Precios
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Elige el plan que mejor se adapte a tus necesidades
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {displayPlans.map((plan) => (
            <Card
              key={plan.id}
              className={`relative ${
                plan.name === "pro"
                  ? "border-primary shadow-lg scale-105"
                  : ""
              }`}
            >
              {plan.name === "pro" && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-bold">
                    POPULAR
                  </span>
                </div>
              )}

              <CardHeader className="text-center">
                <div className="mx-auto mb-4">
                  {plan.name === "free" && <Heart className="w-12 h-12 text-muted-foreground" />}
                  {plan.name === "pro" && <Zap className="w-12 h-12 text-primary" />}
                  {plan.name === "lifetime" && <Crown className="w-12 h-12 text-yellow-500" />}
                </div>
                <CardTitle className="text-2xl">{plan.displayName}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">
                    {plan.price === 0 ? "Gratis" : `${plan.price}€`}
                  </span>
                  {plan.price > 0 && plan.interval !== "one-time" && (
                    <span className="text-muted-foreground">
                      /{plan.interval === "month" ? "mes" : "año"}
                    </span>
                  )}
                  {plan.interval === "one-time" && plan.price > 0 && (
                    <span className="text-muted-foreground"> (pago único)</span>
                  )}
                </div>
              </CardHeader>

              <CardContent>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center">
                      <Check className="w-5 h-5 text-green-500 mr-2 shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                {plan.name === "free" ? (
                  <Button variant="outline" className="w-full">
                    <Link href="/auth/register">Empezar Gratis</Link>
                  </Button>
                ) : plan.name === "lifetime" ? (
                  <div className="space-y-2">
                    <StripeCheckout
                      type="one-time-subscription"
                      planId={plan.id}
                      label={`Pagar ${plan.price}€ con Stripe`}
                    />
                    <PayPalDonate amount={plan.price} />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <StripeCheckout
                      type="subscription"
                      planId={plan.id}
                      label={`Suscribirse con Stripe (${plan.price}€/mes)`}
                    />
                    <p className="text-xs text-muted-foreground text-center">
                      ¿Ya tienes cuenta?{" "}
                      <Link href="/pricing" className="underline">
                        Inicia sesión primero
                      </Link>
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-16 text-center">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="pt-6">
              <Heart className="w-8 h-8 text-red-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">¿Quieres apoyarnos?</h3>
              <p className="text-muted-foreground mb-4">
                Si disfrutas de Secret Passage, considera hacer una donación para ayudarnos a seguir mejorando.
              </p>
              <div className="flex gap-2 justify-center">
                <StripeCheckout type="donation" amount={5} label="Donar 5€ con Stripe" />
                <PayPalDonate amount={5} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
