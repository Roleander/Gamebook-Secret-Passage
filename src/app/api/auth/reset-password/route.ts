import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { z } from "zod";

const resetSchema = z.object({
  token: z.string().min(1).max(500),
  password: z.string().min(1).max(200),
});

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = resetSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Token y contraseña son requeridos", code: "RESET_MISSING" },
        { status: 400 }
      );
    }
    const { token, password } = parsed.data;

    if (password.length < 8) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 8 caracteres", code: "WEAK_PASSWORD" },
        { status: 400 }
      );
    }

    // Find valid token
    const resetToken = await db.passwordReset.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!resetToken) {
      return NextResponse.json(
        { error: "Token inválido o expirado", code: "TOKEN_INVALID" },
        { status: 400 }
      );
    }

    // Check if token is expired
    if (resetToken.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "Token expirado. Solicita uno nuevo.", code: "TOKEN_EXPIRED" },
        { status: 400 }
      );
    }

    // Check if token was already used
    if (resetToken.used) {
      return NextResponse.json(
        { error: "Token ya utilizado. Solicita uno nuevo.", code: "TOKEN_USED" },
        { status: 400 }
      );
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update password and mark token as used
    await db.$transaction([
      db.user.update({
        where: { id: resetToken.userId },
        data: { password: hashedPassword },
      }),
      db.passwordReset.update({
        where: { id: resetToken.id },
        data: { used: true },
      }),
    ]);

    return NextResponse.json({
      message: "Contraseña restablecida correctamente. Ya puedes iniciar sesión.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: "Error al restablecer la contraseña", code: "RESET_SERVER" },
      { status: 500 }
    );
  }
}
