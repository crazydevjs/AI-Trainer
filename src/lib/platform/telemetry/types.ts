export interface TelemetryEvent {
  name: string;
  timestamp: number;
  properties?: Record<string, string | number | boolean | null>;
}

export interface TimingSample {
  name: string;
  durationMs: number;
  timestamp: number;
}

export interface TrackedError {
  message: string;
  stack?: string;
  context?: Record<string, string | number | boolean | null>;
  timestamp: number;
}
