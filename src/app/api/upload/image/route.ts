import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { put } from "@vercel/blob";
import { db } from "@/lib/db";
import {
  ALLOWED_IMAGE_MIME,
  IMAGE_MIME_EXT,
  MAX_IMAGE_SIZE,
  detectImageMime,
  sanitizeSvg,
} from "@/lib/image-validate";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const type = formData.get("type");

    if (!file) {
      return NextResponse.json({ error: "No se proporcionó archivo" }, { status: 400 });
    }

    if (type !== "avatar" && type !== "logo") {
      return NextResponse.json({ error: "Tipo de subida no válido" }, { status: 400 });
    }

    if (!(ALLOWED_IMAGE_MIME as readonly string[]).includes(file.type)) {
      return NextResponse.json(
        { error: "Tipo de archivo no permitido. Usa JPG, PNG, WebP o SVG." },
        { status: 400 }
      );
    }

    if (file.size > MAX_IMAGE_SIZE) {
      return NextResponse.json(
        { error: `Archivo demasiado grande (${(file.size / 1024 / 1024).toFixed(1)}MB). Máximo 2MB.` },
        { status: 400 }
      );
    }

    const userId = (session.user as { id?: string }).id;
    const role = (session.user as { role?: string }).role;

    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (type === "logo" && role !== "ADMIN") {
      return NextResponse.json(
        { error: "Solo los administradores pueden cambiar el logo" },
        { status: 403 }
      );
    }

    const bytes = new Uint8Array(await file.arrayBuffer());

    if (bytes.length > MAX_IMAGE_SIZE) {
      return NextResponse.json(
        { error: "Archivo demasiado grande. Máximo 2MB." },
        { status: 400 }
      );
    }

    const detected = detectImageMime(bytes);
    if (!detected || detected !== file.type) {
      return NextResponse.json(
        { error: "El contenido del archivo no coincide con su tipo." },
        { status: 400 }
      );
    }

    let content: Buffer = Buffer.from(bytes);
    if (detected === "image/svg+xml") {
      const clean = sanitizeSvg(new TextDecoder().decode(bytes));
      if (!/<svg[\s>]/i.test(clean)) {
        return NextResponse.json({ error: "SVG inválido" }, { status: 400 });
      }
      content = Buffer.from(clean, "utf8");
    }

    const ext = IMAGE_MIME_EXT[detected];
    const pathname = `${type}/${userId}.${ext}`;

    const blob = await put(pathname, content, {
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
