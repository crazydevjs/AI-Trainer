// AI Validation & Benchmark Framework — offline-only measurement tooling.
// Never runs during a live session, never changes runtime inference; see
// SYSTEM_ARCHITECTURE.md "AI Validation & Benchmark Framework". Runs from
// both Next.js API routes and plain-Node CLI scripts (scripts/validation/),
// so nothing here imports "server-only" — that marker isn't resolvable
// outside Next's own bundler and would break the CLI scripts.

export * as dataset from "./dataset";
export * as groundTruth from "./ground-truth";
export * as statistics from "./statistics";
export * as metrics from "./metrics";
export * as confusionMatrix from "./confusion-matrix";
export * as benchmark from "./benchmark";
export * as evaluation from "./evaluation";
export * as comparison from "./comparison";
export * as thresholdTesting from "./threshold-testing";
export * as calibration from "./calibration";
export * as experiment from "./experiment";
export * as leaderboard from "./leaderboard";
export * as videoReview from "./video-review";
export * as reports from "./reports";
export * as validator from "./validator";
