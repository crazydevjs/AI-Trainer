export type ErrorKind = "client" | "server";

export interface ErrorGroup {
  fingerprint: string;
  message: string;
  kind: ErrorKind;
  firstSeenAt: number;
  lastSeenAt: number;
  count: number;
  sampleStack?: string;
}

export interface ErrorOccurrence {
  fingerprint: string;
  kind: ErrorKind;
  timestamp: number;
}
