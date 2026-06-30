// Local store of developer debug sessions (dev-mode only, localStorage).

export interface DevSession {
  id: string;
  ts: number;
  exercise: string;
  slug: string;
  weight?: string;
  cameraAngle?: string;
  device?: string;
  tier: string;
  engine: string; // final pose engine: "2D" | "3D"
  avgFps: number;
  avgInferenceMs: number;
  confidence: number;
  actualReps: number;
  falseReps: number; // manual (needs video ground-truth)
  missedReps: number; // engine-rejected attempts (proxy)
  trackingLoss: number;
  fallbackEvents: number;
  aiBuild: string;
  notes?: string;
  favorite?: boolean;
}

const KEY = "forge:devsessions";
const CAP = 200;

export function loadSessions(): DevSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as DevSession[]) : [];
  } catch {
    return [];
  }
}

function persist(list: DevSession[]) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(KEY, JSON.stringify(list.slice(0, CAP)));
  }
}

export function saveSession(s: DevSession) {
  const list = loadSessions();
  if (list.some((x) => x.id === s.id)) return; // dedupe
  persist([s, ...list]);
}

export function deleteSession(id: string) {
  persist(loadSessions().filter((s) => s.id !== id));
}

export function toggleFavorite(id: string) {
  persist(
    loadSessions().map((s) => (s.id === id ? { ...s, favorite: !s.favorite } : s))
  );
}

export function clearSessions() {
  persist([]);
}
