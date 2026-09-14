import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { generatePDF, generateEPUB } from "@/lib/exporters/pdf";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    const { projectId, format } = await req.json();

    if (!projectId || !format) {
      return NextResponse.json(
        { error: "projectId y format son requeridos" },
        { status: 400 }
      );
    }

    // Verify project belongs to user
    const project = await db.project.findFirst({
      where: {
        id: projectId,
        userId: (session.user as any).id,
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Proyecto no encontrado" },
        { status: 404 }
      );
    }

    let content: string | object;
    let contentType: string;
    let fileExtension: string;

    switch (format) {
      case "pdf":
        content = await generatePDF(projectId);
        contentType = "text/html";
        fileExtension = "html";
        break;
      case "epub":
        content = await generateEPUB(projectId);
        contentType = "application/json";
        fileExtension = "json";
        break;
      default:
        return NextResponse.json(
          { error: "Formato no soportado. Usa 'pdf' o 'epub'" },
          { status: 400 }
        );
    }

    const body = typeof content === "string" ? content : JSON.stringify(content);

    return new NextResponse(body, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${project.title}.${fileExtension}"`,
      },
    });
  } catch (error) {
    console.error("Error exporting:", error);
    return NextResponse.json(
      { error: "Error al exportar el proyecto" },
      { status: 500 }
    );
  }
}
