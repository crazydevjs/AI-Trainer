export type ApiVersion = "v1";

export interface VersionNegotiationResult {
  version: ApiVersion;
  requested: string | null;
  deprecated: boolean;
}
