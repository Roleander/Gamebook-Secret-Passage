import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { signExtToken, EXT_TOKEN_TTL_DAYS } from "@/lib/ext-auth";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const signed = signExtToken(session.user.id);
    if (!signed) {
      return NextResponse.json(
        { error: "Servidor sin NEXTAUTH_SECRET configurado" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ...signed, expiresInDays: EXT_TOKEN_TTL_DAYS });
  } catch (error) {
    console.error("Ext token error:", error);
    return NextResponse.json({ error: "Error al generar el token" }, { status: 500 });
  }
}
