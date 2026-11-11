import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  count: vi.fn(),
  transaction: vi.fn(),
  getEntitlements: vi.fn(),
}));

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(async () => ({ user: { id: "u1", role: "USER" } })),
}));

vi.mock("@/app/api/auth/[...nextauth]/route", () => ({
  authOptions: {},
}));

vi.mock("@/lib/db", () => ({
  db: {
    project: {
      findFirst: mocks.findFirst,
      count: mocks.count,
    },
    $transaction: mocks.transaction,
  },
}));

vi.mock("@/lib/entitlements", () => ({
  getEntitlements: mocks.getEntitlements,
  limitReached: (message: string) =>
    new Response(JSON.stringify({ error: message }), {
      status: 402,
      headers: { "Content-Type": "application/json" },
    }),
}));

import { POST } from "@/app/api/projects/[projectId]/duplicate/route";

const originalProject = {
  id: "p1",
  title: "El códice",
  description: "Una aventura",
  userId: "u1",
  imports: [
    {
      filename: "codice.txt",
      fileType: "txt",
      passagesCount: 2,
      rawContent: "1. Umbral\nVe al 2\n2. Fin",
    },
  ],
  passages: [
    {
      id: "a",
      number: 1,
      title: "Umbral",
      content: "Ve al 2",
      sortOrder: 0,
      isStart: true,
      isEndpoint: false,
      illustration:
        "https://store.public.blob.vercel-storage.com/illustrations/u/a.png",
      illustrationAlt: "Un dragón",
      outgoingLinks: [
        { targetId: "b", linkText: "Seguir", condition: null },
        { targetId: "externo", linkText: "Otro proyecto", condition: "x" },
      ],
    },
    {
      id: "b",
      number: 2,
      title: null,
      content: "Fin",
      sortOrder: 1,
      isStart: false,
      isEndpoint: true,
      illustration: null,
      illustrationAlt: null,
      outgoingLinks: [],
    },
  ],
};

function request(projectId = "p1"): Request {
  return new Request(`http://localhost/api/projects/${projectId}/duplicate`, {
    method: "POST",
  });
}

function context(projectId = "p1") {
  return { params: Promise.resolve({ projectId }) };
}

beforeEach(() => {
  mocks.findFirst.mockReset();
  mocks.count.mockReset();
  mocks.transaction.mockReset();
  mocks.getEntitlements.mockReset();
  mocks.getEntitlements.mockResolvedValue({
    maxProjects: null,
    maxPassages: null,
  });
});

describe("POST /api/projects/[projectId]/duplicate", () => {
  it("copia pasajes con ids nuevos, ilustraciones y enlaces internos remapeados", async () => {
    mocks.findFirst.mockResolvedValue(originalProject);

    const tx = {
      project: {
        create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
          id: "copy-1",
          ...data,
        })),
      },
      passage: {
        createMany: vi.fn(
          async (_args: { data: Array<Record<string, unknown>> }) => ({ count: 2 })
        ),
      },
      passageLink: {
        createMany: vi.fn(
          async (_args: { data: Array<Record<string, unknown>> }) => ({ count: 1 })
        ),
      },
      importHistory: { create: vi.fn(async () => ({})) },
    };
    mocks.transaction.mockImplementation(
      async (callback: (client: typeof tx) => unknown) => callback(tx)
    );

    const response = await POST(request(), context());
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.id).toBe("copy-1");
    expect(body.title).toBe("Copia de El códice");
    expect(body.passageCount).toBe(2);

    const createdPassages = tx.passage.createMany.mock.calls[0][0].data as Array<
      Record<string, unknown>
    >;
    expect(createdPassages).toHaveLength(2);
    expect(createdPassages.map((p) => p.id)).not.toContain("a");
    expect(createdPassages.map((p) => p.id)).not.toContain("b");
    expect(new Set(createdPassages.map((p) => p.id)).size).toBe(2);

    const first = createdPassages.find((p) => p.number === 1)!;
    const second = createdPassages.find((p) => p.number === 2)!;
    expect(first.illustration).toBe(originalProject.passages[0].illustration);
    expect(first.illustrationAlt).toBe("Un dragón");
    expect(first.projectId).toBe("copy-1");

    const createdLinks = tx.passageLink.createMany.mock.calls[0][0].data as Array<
      Record<string, unknown>
    >;
    expect(createdLinks).toHaveLength(1);
    expect(createdLinks[0]).toMatchObject({
      sourceId: first.id,
      targetId: second.id,
      linkText: "Seguir",
      condition: null,
    });

    expect(tx.importHistory.create).toHaveBeenCalledWith({
      data: {
        projectId: "copy-1",
        filename: "codice.txt",
        fileType: "txt",
        passagesCount: 2,
        rawContent: "1. Umbral\nVe al 2\n2. Fin",
      },
    });
  });

  it("rechaza el duplicado si se alcanza el límite de proyectos", async () => {
    mocks.findFirst.mockResolvedValue(originalProject);
    mocks.getEntitlements.mockResolvedValue({
      maxProjects: 1,
      maxPassages: null,
    });
    mocks.count.mockResolvedValue(1);

    const response = await POST(request(), context());

    expect(response.status).toBe(402);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("rechaza el duplicado si el proyecto supera el límite de pasajes", async () => {
    mocks.findFirst.mockResolvedValue(originalProject);
    mocks.getEntitlements.mockResolvedValue({
      maxProjects: null,
      maxPassages: 1,
    });

    const response = await POST(request(), context());

    expect(response.status).toBe(402);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});
