import type { SemVer } from "./types";

const PATTERN = /^(\d+)\.(\d+)\.(\d+)$/;

export function parseVersion(raw: string): SemVer {
  const match = PATTERN.exec(raw.trim());
  if (!match) throw new Error(`Not a valid version string (expected "major.minor.patch"): "${raw}"`);
  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) };
}

export function formatVersion(v: SemVer): string {
  return `${v.major}.${v.minor}.${v.patch}`;
}

/** -1 if a < b, 0 if equal, 1 if a > b. */
export function compareVersions(a: string, b: string): -1 | 0 | 1 {
  const va = parseVersion(a);
  const vb = parseVersion(b);
  if (va.major !== vb.major) return va.major < vb.major ? -1 : 1;
  if (va.minor !== vb.minor) return va.minor < vb.minor ? -1 : 1;
  if (va.patch !== vb.patch) return va.patch < vb.patch ? -1 : 1;
  return 0;
}

export function bumpVersion(raw: string, part: "major" | "minor" | "patch"): string {
  const v = parseVersion(raw);
  if (part === "major") return formatVersion({ major: v.major + 1, minor: 0, patch: 0 });
  if (part === "minor") return formatVersion({ major: v.major, minor: v.minor + 1, patch: 0 });
  return formatVersion({ major: v.major, minor: v.minor, patch: v.patch + 1 });
}
