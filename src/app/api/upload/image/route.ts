import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { put } from "@vercel/blob";
import { db } from "@/lib/db";

const MAX_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const type = formData.get("type") as string; // "avatar" or "logo"

    if (!file) {
      return NextResponse.json({ error: "No se proporcionó archivo" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Tipo de archivo no permitido. Usa JPG, PNG, WebP o SVG." },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: `Archivo demasiado grande (${(file.size / 1024 / 1024).toFixed(1)}MB). Máximo 2MB.` },
        { status: 400 }
      );
    }

    const userId = (session.user as any).id;
    const role = (session.user as any).role;

    // Authorize BEFORE uploading so invalid requests never hit Blob storage
    if (type === "logo" && role !== "ADMIN") {
      return NextResponse.json(
        { error: "Solo los administradores pueden cambiar el logo" },
        { status: 403 }
      );
    }

    const ext = file.name.split(".").pop() || "jpg";
    const pathname = `${type}/${userId}.${ext}`;

    const blob = await put(pathname, file, {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
    });

    if (type === "avatar") {
      await db.user.update({
        where: { id: userId },
        data: { avatar: blob.url },
      });
    }
    // type === "logo": URL returned only — persisted via PUT /api/admin/config
    // when the admin presses "Guardar logo" in the profile page.

    return NextResponse.json({
      url: blob.url,
      pathname: blob.pathname,
      persisted: type !== "logo",
    });
  } catch (error) {
    console.error("Error uploading image:", error);
    return NextResponse.json({ error: "Error al subir imagen" }, { status: 500 });
  }
}
