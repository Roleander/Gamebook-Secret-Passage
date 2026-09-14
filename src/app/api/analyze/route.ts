import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { createPassageDetector, createConnectionFinder } from "@/lib/agents";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    const { projectId, action } = await req.json();

    if (!projectId || !action) {
      return NextResponse.json(
        { error: "projectId y action son requeridos" },
        { status: 400 }
      );
    }

    // Verify project belongs to user
    const project = await db.project.findFirst({
      where: {
        id: projectId,
        userId: (session.user as any).id,
      },
      include: {
        passages: {
          orderBy: { number: "asc" },
        },
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Proyecto no encontrado" },
        { status: 404 }
      );
    }

    switch (action) {
      case "detect_passages": {
        // Analyze raw content to detect passages
        const importHistory = await db.importHistory.findFirst({
          where: { projectId },
          orderBy: { importedAt: "desc" },
        });

        if (!importHistory?.rawContent) {
          return NextResponse.json(
            { error: "No hay contenido raw para analizar" },
            { status: 400 }
          );
        }

        const detector = createPassageDetector();
        const detected = detector.detect(importHistory.rawContent);

        return NextResponse.json({
          detectedPassages: detected,
          suggestions: detector.suggestNumbers(detected),
        });
      }

      case "find_connections": {
        // Analyze passages to find connections
        const passages = project.passages.map(p => ({
          number: p.number,
          content: p.content,
        }));

        const finder = createConnectionFinder();
        const result = finder.findConnections(passages);

        return NextResponse.json(result);
      }

      case "suggest_connections": {
        // Suggest new connections based on content
        const passages = project.passages.map(p => ({
          number: p.number,
          content: p.content,
        }));

        const finder = createConnectionFinder();
        const suggestions = finder.suggestConnections(passages);

        return NextResponse.json({ suggestions });
      }

      default:
        return NextResponse.json(
          { error: "Acción no reconocida" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error analyzing:", error);
    return NextResponse.json(
      { error: "Error al analizar el proyecto" },
      { status: 500 }
    );
  }
}
