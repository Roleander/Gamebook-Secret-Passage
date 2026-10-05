import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { z } from "zod";
import { parseOr400 } from "@/lib/api-validate";

const donationSchema = z.object({
  amount: z
    .number({ error: "Importe inválido" })
    .positive({ error: "Importe inválido" })
    .max(1000000, { error: "Importe inválido" }),
  currency: z.string().max(10).optional(),
  paymentMethod: z.string().max(32).optional(),
  paypalOrderId: z.string().max(100).nullable().optional(),
  message: z.string().max(1000).nullable().optional(),
});

// POST - Record a donation
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    const parsed = parseOr400(
      donationSchema,
      await req.json().catch(() => null)
    );
    if (!parsed.ok) return parsed.response;
    const { amount, currency, paymentMethod, paypalOrderId, message } =
      parsed.data;

    const donation = await db.donation.create({
      data: {
        userId: session?.user ? (session.user as any).id : null,
        amount,
        currency: currency || "EUR",
        paymentMethod: paymentMethod || "paypal",
        paypalOrderId,
        status: "completed",
        message,
      },
    });

    return NextResponse.json(donation);
  } catch (error) {
    console.error("Error recording donation:", error);
    return NextResponse.json(
      { error: "Error al registrar donación" },
      { status: 500 }
    );
  }
}

// GET - Get user's donation history
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const donations = await db.donation.findMany({
      where: {
        userId: (session.user as any).id,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(donations);
  } catch (error) {
    console.error("Error fetching donations:", error);
    return NextResponse.json(
      { error: "Error al obtener donaciones" },
      { status: 500 }
    );
  }
}
