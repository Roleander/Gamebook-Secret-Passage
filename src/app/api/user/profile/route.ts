import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        bio: true,
        theme: true,
        role: true,
        createdAt: true,
        subscription: {
          include: { plan: true },
        },
        donations: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json({ error: "Error al obtener perfil" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await req.json();
    const { name, bio, theme, currentPassword, newPassword } = body;

    // Password change
    if (currentPassword && newPassword) {
      const user = await db.user.findUnique({ where: { id: userId } });
      if (!user) {
        return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
      }

      const valid = await bcrypt.compare(currentPassword, user.password);
      if (!valid) {
        return NextResponse.json({ error: "Contraseña actual incorrecta" }, { status: 400 });
      }

      if (newPassword.length < 6) {
        return NextResponse.json({ error: "La nueva contraseña debe tener al menos 6 caracteres" }, { status: 400 });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 12);
      await db.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
      });
    }

    // Update profile fields
    const updateData: Record<string, any> = {};
    if (name !== undefined) updateData.name = name;
    if (bio !== undefined) updateData.bio = bio;
    if (theme !== undefined) updateData.theme = typeof theme === "string" ? theme : JSON.stringify(theme);

    if (Object.keys(updateData).length > 0) {
      await db.user.update({
        where: { id: userId },
        data: updateData,
      });
    }

    return NextResponse.json({ message: "Perfil actualizado" });
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json({ error: "Error al actualizar perfil" }, { status: 500 });
  }
}
