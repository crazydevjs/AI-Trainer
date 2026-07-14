export type { ReportFormat } from "./types";
export { REPORT_EXTENSIONS } from "./types";
export { toJsonReport } from "./json";
export { toMarkdownReport } from "./markdown";
export { toCsvReport } from "./csv";
export { toHtmlReport } from "./html";

import { toJsonReport } from "./json";
import { toMarkdownReport } from "./markdown";
import { toCsvReport } from "./csv";
import { toHtmlReport } from "./html";
import type { ExerciseBenchmarkReport } from "../evaluation";
import type { ReportFormat } from "./types";

export function renderReport(reports: ExerciseBenchmarkReport[], format: ReportFormat): string {
  switch (format) {
    case "json":
      return toJsonReport(reports);
    case "markdown":
      return toMarkdownReport(reports);
    case "csv":
      return toCsvReport(reports);
    case "html":
      return toHtmlReport(reports);
  }
}
