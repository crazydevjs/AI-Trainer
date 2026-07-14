import type { ExerciseBenchmarkReport } from "../evaluation";

const pct = (n: number) => `${Math.round(n * 100)}%`;

export function toMarkdownReport(reports: ExerciseBenchmarkReport[]): string {
  const lines: string[] = [
    `# AI Validation Report`,
    ``,
    `Generated ${new Date().toISOString()} · ${reports.length} exercise${reports.length === 1 ? "" : "s"}`,
    ``,
    `| Exercise | Sessions | Labeled | Precision | Recall | F1 | Mean Count Error | Avg FPS | P95 Inference (ms) |`,
    `|---|---|---|---|---|---|---|---|---|`,
  ];

  for (const r of reports) {
    lines.push(
      `| ${r.exerciseSlug} | ${r.sessionCount} | ${r.labeledSessionCount} | ` +
        `${r.repCounting ? pct(r.repCounting.macroClassification.precision) : "—"} | ` +
        `${r.repCounting ? pct(r.repCounting.macroClassification.recall) : "—"} | ` +
        `${r.repCounting ? pct(r.repCounting.macroClassification.f1) : "—"} | ` +
        `${r.repCounting ? r.repCounting.meanCountAbsError.toFixed(2) : "—"} | ` +
        `${r.avgFps.toFixed(1)} | ${r.latency.p95Ms.toFixed(1)} |`,
    );
  }

  return lines.join("\n") + "\n";
}
