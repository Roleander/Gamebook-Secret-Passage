import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { del } from "@vercel/blob";
import { getStripe, cancelSubscriptionAtProvider } from "@/lib/billing";
import { confirmEmailMatches } from "@/lib/delete-account";

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado", code: "UNAUTHORIZED" }, { status: 401 });
    }

    const userId = session.user.id;
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado", code: "USER_NOT_FOUND" }, { status: 404 });
    }

    const body = await req.json().catch(() => null);
    const password = typeof body?.password === "string" ? body.password : "";
    const confirmEmail = typeof body?.confirmEmail === "string" ? body.confirmEmail : "";

    if (!password || !confirmEmail) {
      return NextResponse.json(
        { error: "Introduce tu contraseña y tu email", code: "DELETE_MISSING" },
        { status: 400 }
      );
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return NextResponse.json(
        { error: "La contraseña es incorrecta", code: "WRONG_PASSWORD" },
        { status: 400 }
      );
    }

    if (!confirmEmailMatches(confirmEmail, user.email)) {
      return NextResponse.json(
        { error: "El email no coincide con el de tu cuenta", code: "EMAIL_MISMATCH" },
        { status: 400 }
      );
    }

    const activeSubscription = await db.subscription.findFirst({
      where: { userId, status: { in: ["active", "trialing"] } },
    });
    if (activeSubscription) {
      await cancelSubscriptionAtProvider(activeSubscription);
    }

    if (user.stripeCustomerId) {
      try {
        await getStripe().customers.del(user.stripeCustomerId);
      } catch (stripeError) {
        console.error("Stripe customer delete error:", stripeError);
      }
    }

    if (user.avatar) {
      try {
        await del(user.avatar);
      } catch (blobError) {
        console.error("Avatar delete error:", blobError);
      }
    }

    await db.user.delete({ where: { id: userId } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error deleting account:", error);
    return NextResponse.json(
      { error: "Error al eliminar la cuenta", code: "DELETE_SERVER" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
