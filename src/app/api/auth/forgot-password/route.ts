import { NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { isEmailConfigured, sendPasswordResetEmail } from "@/lib/email";
import { appUrl } from "@/lib/site-url";
import { z } from "zod";

const forgotSchema = z.object({
  email: z.string().min(1).max(254),
});

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = forgotSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "El email es requerido", code: "EMAIL_REQUIRED" },
        { status: 400 }
      );
    }
    const { email } = parsed.data;

    // Find user
    const user = await db.user.findFirst({
      where: {
        email: {
          equals: typeof email === "string" ? email.trim() : "",
          mode: "insensitive",
        },
      },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({
        message: "Si el email existe, recibirás un enlace para restablecer tu contraseña.",
      });
    }

    // Invalidate any existing reset tokens for this user
    await db.passwordReset.updateMany({
      where: {
        userId: user.id,
        used: false,
      },
      data: {
        used: true,
      },
    });

    // Generate reset token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store token
    await db.passwordReset.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    const resetUrl = appUrl(`/auth/reset-password?token=${token}`);

    if (isEmailConfigured()) {
      const sent = await sendPasswordResetEmail(user.email, resetUrl);
      if (!sent) {
        console.error(`[PASSWORD RESET] email send failed for ${user.email}`);
      }
    } else if (process.env.NODE_ENV !== "production") {
      console.log(`[PASSWORD RESET] ${user.email}: ${resetUrl}`);
    } else {
      console.error(
        `[PASSWORD RESET] EMAIL_API_KEY/EMAIL_FROM no configurados; no se envió reset a ${user.email}`
      );
    }

    return NextResponse.json({
      message: "Si el email existe, recibirás un enlace para restablecer tu contraseña.",
      // Dev only — remove in production
      ...(process.env.NODE_ENV === "development" && { resetUrl, token }),
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Error al procesar la solicitud", code: "FORGOT_SERVER" },
      { status: 500 }
    );
  }
}
