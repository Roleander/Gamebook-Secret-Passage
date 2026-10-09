"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, ExternalLink, Heart } from "lucide-react";

interface DonationRow {
  id: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  status: string;
  createdAt: string;
  user: { email: string; name: string | null } | null;
}

interface SubscriptionRow {
  id: string;
  status: string;
  startDate: string;
  endDate: string | null;
  createdAt: string;
  user: { email: string; name: string | null } | null;
  plan: { displayName: string; name: string; price: number; interval: string };
}

interface PaymentsSummary {
  donationsTotal: number;
  donationsCount: number;
  activeSubscriptions: number;
  monthlyRevenue: number;
}

interface PaymentsData {
  donations: DonationRow[];
  subscriptions: SubscriptionRow[];
  summary: PaymentsSummary;
}

export function PaymentsPanel() {
  const [data, setData] = useState<PaymentsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/payments");
        if (res.ok) {
          setData(await res.json());
        } else {
          setError("No se pudieron cargar los pagos");
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <p className="text-muted-foreground py-4">Cargando…</p>;
  }
  if (error || !data) {
    return <p className="text-destructive py-4">{error || "Error"}</p>;
  }

  const { summary, donations, subscriptions } = data;

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 flex items-center">
            <Heart className="w-10 h-10 text-primary" />
            <div className="ml-4">
              <p className="text-sm text-muted-foreground">
                Donaciones ({summary.donationsCount})
              </p>
              <p className="text-2xl font-bold">
                {summary.donationsTotal.toFixed(2)} €
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center">
            <CreditCard className="w-10 h-10 text-primary" />
            <div className="ml-4">
              <p className="text-sm text-muted-foreground">
                Suscripciones activas
              </p>
              <p className="text-2xl font-bold">{summary.activeSubscriptions}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center">
            <CreditCard className="w-10 h-10 text-primary" />
            <div className="ml-4">
              <p className="text-sm text-muted-foreground">
                Ingreso recurrente/mes
              </p>
              <p className="text-2xl font-bold">
                {summary.monthlyRevenue.toFixed(2)} €
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-4 text-sm">
        <a
          href="https://dashboard.stripe.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-primary hover:underline"
        >
          Dashboard Stripe <ExternalLink className="w-3 h-3" />
        </a>
        <a
          href="https://www.paypal.com/business/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-primary hover:underline"
        >
          Dashboard PayPal <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Últimas donaciones ({donations.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {donations.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">
              Aún no hay donaciones
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b">
                    <th className="py-2 pr-4">Fecha</th>
                    <th className="py-2 pr-4">Usuario</th>
                    <th className="py-2 pr-4">Método</th>
                    <th className="py-2 pr-4 text-right">Importe</th>
                    <th className="py-2">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {donations.map((d) => (
                    <tr key={d.id} className="border-b last:border-0">
                      <td className="py-2 pr-4">
                        {d.createdAt.slice(0, 10)}
                      </td>
                      <td className="py-2 pr-4">
                        {d.user ? d.user.email : "Anónimo"}
                      </td>
                      <td className="py-2 pr-4 uppercase">
                        {d.paymentMethod}
                      </td>
                      <td className="py-2 pr-4 text-right">
                        {d.amount.toFixed(2)} {d.currency}
                      </td>
                      <td className="py-2">{d.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Suscripciones ({subscriptions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {subscriptions.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">
              Aún no hay suscripciones
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b">
                    <th className="py-2 pr-4">Fecha</th>
                    <th className="py-2 pr-4">Usuario</th>
                    <th className="py-2 pr-4">Plan</th>
                    <th className="py-2 pr-4 text-right">Precio</th>
                    <th className="py-2">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.map((s) => (
                    <tr key={s.id} className="border-b last:border-0">
                      <td className="py-2 pr-4">
                        {s.createdAt.slice(0, 10)}
                      </td>
                      <td className="py-2 pr-4">
                        {s.user ? s.user.email : "—"}
                      </td>
                      <td className="py-2 pr-4">{s.plan.displayName}</td>
                      <td className="py-2 pr-4 text-right">
                        {s.plan.price.toFixed(2)} €/{s.plan.interval === "year" ? "año" : "mes"}
                      </td>
                      <td className="py-2">{s.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
