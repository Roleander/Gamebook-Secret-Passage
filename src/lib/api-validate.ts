import { NextResponse } from "next/server";
import { z } from "zod";

type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; response: NextResponse };

export function parseOr400<S extends z.ZodType>(
  schema: S,
  body: unknown
): ParseResult<z.infer<S>> {
  const result = schema.safeParse(body);
  if (result.success) {
    return { ok: true, data: result.data };
  }
  return {
    ok: false,
    response: NextResponse.json(
      {
        error: result.error.issues[0]?.message || "Datos inválidos",
        details: result.error.issues.map(
          (issue) => `${issue.path.join(".")}: ${issue.message}`
        ),
      },
      { status: 400 }
    ),
  };
}
