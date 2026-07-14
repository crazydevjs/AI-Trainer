import type { ZodType } from "zod";

export type ValidationResult<T> = { ok: true; data: T } | { ok: false; error: string };

/** Thin, reusable wrapper around the zod schemas already used throughout
 *  the app (see `src/lib/validators.ts`) — gives every API route the same
 *  shape of parse result instead of re-deriving `.safeParse()` handling
 *  ad hoc at each call site. */
export function validateRequest<T>(schema: ZodType<T>, data: unknown): ValidationResult<T> {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  return { ok: true, data: parsed.data };
}
