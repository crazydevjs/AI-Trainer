import { promises as fs } from "fs";
import path from "path";
import { REPORT_EXTENSIONS, renderReport, type ReportFormat } from "../reports";
import type { ExerciseBenchmarkReport } from "../evaluation";

const ROOT = path.join(process.cwd(), ".data", "validation", "reports");

export interface LatestReportPointer {
  datasetName: string;
  datasetVersion: number;
  generatedAt: number;
  reports: ExerciseBenchmarkReport[];
}

export async function saveReports(
  datasetName: string,
  datasetVersion: number,
  reports: ExerciseBenchmarkReport[],
  formats: ReportFormat[] = ["json", "markdown", "csv", "html"],
): Promise<string[]> {
  const dir = path.join(ROOT, encodeURIComponent(datasetName), `v${datasetVersion}`);
  await fs.mkdir(dir, { recursive: true });
  const timestamp = Date.now();

  const paths = await Promise.all(
    formats.map(async (format) => {
      const filePath = path.join(dir, `${timestamp}.${REPORT_EXTENSIONS[format]}`);
      await fs.writeFile(filePath, renderReport(reports, format));
      return filePath;
    }),
  );

  // A single, easy-to-find pointer to the most recent run overall — the
  // dashboard/CLI reads this rather than scanning every dataset/version
  // directory for the newest timestamp.
  const pointer: LatestReportPointer = { datasetName, datasetVersion, generatedAt: timestamp, reports };
  await fs.writeFile(path.join(ROOT, "_latest.json"), JSON.stringify(pointer, null, 2));

  return paths;
}

export async function loadLatestReport(): Promise<LatestReportPointer | null> {
  try {
    return JSON.parse(await fs.readFile(path.join(ROOT, "_latest.json"), "utf-8")) as LatestReportPointer;
  } catch {
    return null;
  }
}
