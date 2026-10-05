import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { z } from "zod";

const registerSchema = z.object({
  email: z.string().min(1).max(254),
  name: z.unknown().optional(),
  password: z.string().min(1).max(200),
});

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Email y contraseña son requeridos", code: "REGISTER_MISSING" },
        { status: 400 }
      );
    }
    const { email, name, password } = parsed.data;

    const normalizedEmail =
      typeof email === "string" ? email.trim().toLowerCase() : "";

    if (!normalizedEmail || !password) {
      return NextResponse.json(
        { error: "Email y contraseña son requeridos", code: "REGISTER_MISSING" },
        { status: 400 }
      );
    }

    if (typeof password !== "string" || password.length < 8) {
      return NextResponse.json(
        {
          error: "La contraseña debe tener al menos 8 caracteres",
          code: "WEAK_PASSWORD",
        },
        { status: 400 }
      );
    }

    const existingUser = await db.user.findFirst({
      where: {
        email: { equals: normalizedEmail, mode: "insensitive" },
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "El email ya está registrado", code: "EMAIL_TAKEN" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await db.user.create({
      data: {
        email: normalizedEmail,
        name:
          typeof name === "string" && name.trim()
            ? name.trim()
            : normalizedEmail.split("@")[0],
        password: hashedPassword,
      },
    });

    return NextResponse.json(
      { message: "Usuario creado exitosamente" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Error al crear el usuario", code: "REGISTER_SERVER" },
      { status: 500 }
    );
  }
}
