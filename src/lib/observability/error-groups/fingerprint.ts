import { createHash } from "crypto";

/** Groups errors by message + the first stack frame (file:line stripped
 *  of nothing fancier — good enough to merge "the same error happening
 *  repeatedly," which is the actual goal, not perfect deduplication). */
export function computeFingerprint(message: string, stack?: string): string {
  const firstFrame = stack?.split("\n")[1]?.trim() ?? "";
  return createHash("sha256").update(`${message}\n${firstFrame}`).digest("hex").slice(0, 16);
}
