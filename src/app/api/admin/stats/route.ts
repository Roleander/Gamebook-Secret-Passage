import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    // Check if user is admin
    const user = await db.user.findUnique({
      where: { id: (session.user as any).id },
    });

    if (user?.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Acceso denegado" },
        { status: 403 }
      );
    }

    const [totalUsers, totalProjects, totalPassages] = await Promise.all([
      db.user.count(),
      db.project.count(),
      db.passage.count(),
    ]);

    const recentProjects = await db.project.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { name: true, email: true },
        },
        _count: {
          select: { passages: true },
        },
      },
    });

    return NextResponse.json({
      totalUsers,
      totalProjects,
      totalPassages,
      recentProjects,
    });
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    return NextResponse.json(
      { error: "Error al obtener estadísticas" },
      { status: 500 }
    );
  }
}
