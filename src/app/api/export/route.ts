import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { generatePDF, generateEPUB } from "@/lib/exporters/pdf";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { projectId, format } = await req.json();

    if (!projectId || !format) {
      return NextResponse.json(
        { error: "projectId y format son requeridos" },
        { status: 400 }
      );
    }

    const project = await db.project.findFirst({
      where: {
        id: projectId,
        userId: (session.user as any).id,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
    }

    const safeTitle = project.title.replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ\s-]/g, "").trim();

    switch (format) {
      case "pdf": {
        const html = await generatePDF(projectId);
        return new NextResponse(html, {
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Content-Disposition": `attachment; filename="${safeTitle}.html"`,
          },
        });
      }
      case "epub": {
        const epubContent = await generateEPUB(projectId);
        return new NextResponse(epubContent, {
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Content-Disposition": `attachment; filename="${safeTitle}.epub.json"`,
          },
        });
      }
      default:
        return NextResponse.json(
          { error: "Formato no soportado. Usa 'pdf' o 'epub'" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error exporting:", error);
    return NextResponse.json(
      { error: "Error al exportar el proyecto" },
      { status: 500 }
    );
  }
}
