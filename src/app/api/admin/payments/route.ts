import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const { role } = session.user as { id: string; role?: string };
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const [donations, donationTotals, subscriptions] = await Promise.all([
      db.donation.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
        include: { user: { select: { email: true, name: true } } },
      }),
      db.donation.groupBy({
        by: ["paymentMethod", "currency"],
        _count: { amount: true },
        _sum: { amount: true },
        where: { status: "completed" },
      }),
      db.subscription.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
        include: {
          user: { select: { email: true, name: true } },
          plan: { select: { displayName: true, name: true, price: true, interval: true } },
        },
      }),
    ]);

    const activeSubs = subscriptions.filter(
      (s) => s.status === "active" || s.status === "trialing"
    );
    const monthlyRevenue = activeSubs
      .filter((s) => s.plan.interval === "month")
      .reduce((sum, s) => sum + s.plan.price, 0);
    const donationsTotal = donationTotals.reduce(
      (sum, t) => sum + (t._sum.amount || 0),
      0
    );

    return NextResponse.json({
      donations,
      donationTotals,
      subscriptions,
      summary: {
        donationsTotal,
        donationsCount: donationTotals.reduce((sum, t) => sum + (t._count.amount || 0), 0),
        activeSubscriptions: activeSubs.length,
        monthlyRevenue,
      },
    });
  } catch (error) {
    console.error("Error fetching admin payments:", error);
    return NextResponse.json(
      { error: "Error al obtener pagos" },
      { status: 500 }
    );
  }
}
