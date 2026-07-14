// AI Training & Continuous Improvement Platform — internal MLOps tooling
// that governs *releases* of the AI stack (dataset registry, golden
// datasets, regression/drift detection, release gates, human review,
// feedback routing, active learning). Builds on Phase 12's validation
// framework; never runs during a live session, never affects live
// inference. See SYSTEM_ARCHITECTURE.md "AI Training & Continuous
// Improvement Platform".

export * as versioning from "./versioning";
export * as modelRegistry from "./model-registry";
export * as datasetRegistry from "./dataset-registry";
export * as goldenDatasets from "./golden-datasets";
export * as qualityScore from "./quality-score";
export * as driftDetection from "./drift-detection";
export * as benchmarkRegistry from "./benchmark-registry";
export * as experimentTracker from "./experiment-tracker";
export * as evaluationPipeline from "./evaluation-pipeline";
export * as regressionDetector from "./regression-detector";
export * as releaseGates from "./release-gates";
export * as releaseManager from "./release-manager";
export * as deploymentHistory from "./deployment-history";
export * as humanReview from "./human-review";
export * as feedbackPipeline from "./feedback-pipeline";
export * as activeLearning from "./active-learning";
export * as metricsDashboard from "./metrics-dashboard";
