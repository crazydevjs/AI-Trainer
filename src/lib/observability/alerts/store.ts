import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { Alert, AlertKind, AlertSeverity } from "./types";

const ROOT = path.join(process.cwd(), ".data", "observability", "alerts");

export async function recordAlert(kind: AlertKind, severity: AlertSeverity, message: string): Promise<Alert> {
  const alert: Alert = { id: randomUUID(), kind, severity, message, firedAt: Date.now(), resolved: false };
  await fs.mkdir(ROOT, { recursive: true });
  await fs.writeFile(path.join(ROOT, `${alert.id}.json`), JSON.stringify(alert, null, 2));
  return alert;
}

export async function listAlerts(onlyUnresolved = false): Promise<Alert[]> {
  try {
    const files = (await fs.readdir(ROOT)).filter((f) => f.endsWith(".json"));
    const alerts = await Promise.all(files.map(async (f) => JSON.parse(await fs.readFile(path.join(ROOT, f), "utf-8"))));
    const all = (alerts as Alert[]).sort((a, b) => b.firedAt - a.firedAt);
    return onlyUnresolved ? all.filter((a) => !a.resolved) : all;
  } catch {
    return [];
  }
}

export async function resolveAlert(id: string): Promise<void> {
  const filePath = path.join(ROOT, `${id}.json`);
  const alert = JSON.parse(await fs.readFile(filePath, "utf-8")) as Alert;
  await fs.writeFile(filePath, JSON.stringify({ ...alert, resolved: true }, null, 2));
}
