import type { ExerciseBenchmarkReport } from "../evaluation";

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

const pct = (n: number) => `${Math.round(n * 100)}%`;

/** Self-contained, print-to-PDF-friendly HTML report — no chart-rendering
 *  library is added; the embedded `<script type="application/json">`
 *  block carries the same structured data a chart would be built from
 *  ("include charts data only," per Phase 12's brief), for whatever
 *  renders it later. */
export function toHtmlReport(reports: ExerciseBenchmarkReport[]): string {
  const rows = reports
    .map(
      (r) => `
      <tr>
        <td>${escapeHtml(r.exerciseSlug)}</td>
        <td>${r.sessionCount}</td>
        <td>${r.labeledSessionCount}</td>
        <td>${r.repCounting ? pct(r.repCounting.macroClassification.precision) : "—"}</td>
        <td>${r.repCounting ? pct(r.repCounting.macroClassification.recall) : "—"}</td>
        <td>${r.repCounting ? pct(r.repCounting.macroClassification.f1) : "—"}</td>
        <td>${r.repCounting ? r.repCounting.meanCountAbsError.toFixed(2) : "—"}</td>
        <td>${r.avgFps.toFixed(1)}</td>
        <td>${r.latency.p95Ms.toFixed(1)}</td>
      </tr>`,
    )
    .join("");

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>AI Validation Report</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 2rem; color: #1a1a1a; }
  h1 { font-size: 1.5rem; }
  table { border-collapse: collapse; width: 100%; margin-top: 1rem; }
  th, td { border: 1px solid #ccc; padding: 0.5rem; text-align: left; font-size: 0.9rem; }
  th { background: #f2f2f2; }
  @media print { body { margin: 0.5in; } }
</style>
</head>
<body>
  <h1>AI Validation Report</h1>
  <p>Generated ${new Date().toISOString()} · ${reports.length} exercise${reports.length === 1 ? "" : "s"}</p>
  <table>
    <thead>
      <tr><th>Exercise</th><th>Sessions</th><th>Labeled</th><th>Precision</th><th>Recall</th><th>F1</th><th>Mean Count Error</th><th>Avg FPS</th><th>P95 Inference (ms)</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <script type="application/json" id="chart-data">${JSON.stringify(reports)}</script>
</body>
</html>
`;
}
