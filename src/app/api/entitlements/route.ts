import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getEntitlements } from "@/lib/entitlements";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const role = (session.user as any).role;
    const ents = await getEntitlements(userId, role);

    return NextResponse.json({
      plan: ents.plan,
      planDisplayName: ents.planDisplayName,
      isPro: ents.isPro,
      isAdmin: ents.isAdmin,
      maxProjects: ents.maxProjects,
      maxPassages: ents.maxPassages,
      features: ents.features,
    });
  } catch (error) {
    console.error("Error fetching entitlements:", error);
    return NextResponse.json(
      { error: "Error al obtener los permisos" },
      { status: 500 }
    );
  }
}
