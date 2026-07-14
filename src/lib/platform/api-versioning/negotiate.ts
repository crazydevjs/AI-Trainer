import type { ApiVersion, VersionNegotiationResult } from "./types";

const SUPPORTED_VERSIONS: readonly ApiVersion[] = ["v1"];
const DEFAULT_VERSION: ApiVersion = "v1";

/** Only one API version exists today (v1, implicit in every current
 *  route), so this is a seam, not an active decision point yet — reads
 *  `X-API-Version` so a future mobile client can start sending it before
 *  a v2 exists, and falls back to v1 for anything unrecognized instead of
 *  erroring, matching how the current unversioned routes already behave. */
export function resolveApiVersion(req: Request): VersionNegotiationResult {
  const requested = req.headers.get("x-api-version");
  const version = requested && (SUPPORTED_VERSIONS as string[]).includes(requested)
    ? (requested as ApiVersion)
    : DEFAULT_VERSION;
  return { version, requested, deprecated: false };
}

export function deprecationHeaders(sunsetDate: string): Record<string, string> {
  return { Deprecation: "true", Sunset: sunsetDate };
}
