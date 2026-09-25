import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";

export async function GET() {
  try {
    // Público: solo claves no sensibles (el logo lo muestran cabecera y hero
    // a visitantes anónimos). El resto de la config solo vía PUT (ADMIN).
    const logo = await db.siteConfig.findUnique({ where: { key: "siteLogo" } });
    return NextResponse.json({ siteLogo: logo?.value ?? null });
  } catch (error) {
    return NextResponse.json({ error: "Error al obtener configuración" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await req.json();
    const updates: { key: string; value: string }[] = [];

    for (const [key, value] of Object.entries(body)) {
      if (typeof value === "string") {
        updates.push({ key, value });
      }
    }

    for (const update of updates) {
      await db.siteConfig.upsert({
        where: { key: update.key },
        update: { value: update.value },
        create: { key: update.key, value: update.value },
      });
    }

    return NextResponse.json({ message: "Configuración actualizada" });
  } catch (error) {
    console.error("Error updating config:", error);
    return NextResponse.json({ error: "Error al actualizar configuración" }, { status: 500 });
  }
}
