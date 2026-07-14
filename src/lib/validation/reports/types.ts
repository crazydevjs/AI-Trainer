export type ReportFormat = "json" | "markdown" | "csv" | "html";

export const REPORT_EXTENSIONS: Record<ReportFormat, string> = {
  json: "json",
  markdown: "md",
  csv: "csv",
  html: "html",
};
