import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { getPdfExportLimit } from "@/lib/pdf-quota";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    if ((session.user as any).role !== "ADMIN") {
      return NextResponse.json(
        { error: "Acceso denegado" },
        { status: 403 }
      );
    }

    const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [totalUsers, totalProjects, totalPassages, pdfExports30d] = await Promise.all([
      db.user.count(),
      db.project.count(),
      db.passage.count(),
      db.pdfExportLog.count({ where: { createdAt: { gte: since30d } } }),
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
      pdfExports30d,
      pdfExportLimit: getPdfExportLimit(),
    });
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    return NextResponse.json(
      { error: "Error al obtener estadísticas" },
      { status: 500 }
    );
  }
}
