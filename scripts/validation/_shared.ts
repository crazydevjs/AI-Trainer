// Shared CLI glue for the validation scripts — not part of
// src/lib/validation/ since this is script plumbing (argv parsing,
// process.exit), not a library API. Run any script with `tsx
// scripts/validation/<name>.ts <args>` — see package.json's
// "validation:*" scripts for the exact invocations.

export function requireArg(args: string[], index: number, usage: string): string {
  const value = args[index];
  if (!value) {
    console.error(`Missing argument.\nUsage: ${usage}`);
    process.exit(1);
  }
  return value;
}

export function fail(message: string): never {
  console.error(`Error: ${message}`);
  process.exit(1);
}

/** Splits argv into positional args and `--flag=value` / `--flag` pairs —
 *  used by both validation/ and mlops/ scripts, so it lives in this
 *  shared file rather than being duplicated per script. */
export function parseFlags(args: string[]): { positional: string[]; flags: Record<string, string> } {
  const positional: string[] = [];
  const flags: Record<string, string> = {};
  for (const arg of args) {
    if (arg.startsWith("--")) {
      const [key, value] = arg.slice(2).split("=");
      flags[key] = value ?? "true";
    } else {
      positional.push(arg);
    }
  }
  return { positional, flags };
}

/** Parses a "name@version" reference (e.g. `--golden=squat-golden@3`). */
export function parseDatasetRef(ref: string): { name: string; version: number } {
  const [name, version] = ref.split("@");
  return { name, version: Number(version) };
}
