/* ---------------- SafeHaven data layer: types + real helpers (no dummy seeds) ---------------- */

export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type IncidentStatus = "New" | "Reviewing" | "Reviewed";
export type SourceKind = "webcam" | "video" | "image" | "rtsp";
export type Page =
  | "dashboard" | "live" | "logs" | "cameras" | "models"
  | "analytics" | "settings" | "users" | "profile";

export interface Box { x: number; y: number; w: number; h: number }

export interface Detection {
  label: string;
  confidence: number; // 0..1
  box: Box; // percentages of frame
  isThreat: boolean;
}

export interface CameraSource {
  id: string;
  name: string;
  location: string;
  kind: SourceKind;
  status: "online" | "offline";
  fps: number;
  resolution: string;
  endpoint: string;
  deviceId?: string;
  facing?: "environment" | "user";
  fileName?: string;
  createdAt: number;
  lastHeartbeat: number;
  threats: number;
  detections: number;
}

export interface Incident {
  id: string;
  label: string;        // detected class, e.g. "knife"
  confidence: number;   // percent
  sourceId: string;
  sourceName: string;
  time: number;
  severity: Severity;
  status: IncidentStatus;
  model: string;
  box: Box;
  img: string;          // snapshot dataURL (may be "" if aged out)
}

export interface ModelInfo {
  id: string;
  name: string;
  version: string;
  accuracy: number;
  fps: number;
  classes: string[];
  uploaded: string;
  size: string;
  status: "ACTIVE" | "STANDBY" | "DEPRECATED";
  origin: "backend" | "local" | "default";
}

export interface UserRec {
  id: string;
  name: string;
  username: string;
  role: "ADMIN" | "OPERATOR" | "VIEWER";
  status: "Active" | "Suspended";
  lastLogin: string;
  email: string;
}

export interface Settings {
  weaponDetection: boolean;
  personDetection: boolean;
  motionDetection: boolean;
  boxes: boolean;
  labels: boolean;
  conf: number;   // 0.10 - 0.90
  iou: number;    // 0.10 - 0.90
  cooldown: number; // seconds
  sound: boolean;
  sms: boolean;
  email: boolean;
  browser: boolean;
  smsCfg: { sid: string; token: string; from: string; to: string } | null;
  emailCfg: { host: string; port: string; user: string; pass: string; to: string; enc: "TLS" | "SSL" } | null;
  threatClasses: string; // comma-separated extra threat keywords
  inferenceInterval: number; // ms between inferences
}

export const DEFAULT_SETTINGS: Settings = {
  weaponDetection: true,
  personDetection: true,
  motionDetection: false,
  boxes: true,
  labels: true,
  conf: 0.45,
  iou: 0.5,
  cooldown: 30,
  sound: true,
  sms: false,
  email: true,
  browser: true,
  smsCfg: null,
  emailCfg: null,
  threatClasses: "",
  inferenceInterval: 200,
};

/* ---------------- imagery (public landing page previews only) ---------------- */

const CDN = "https://image.qwenlm.ai/generated-images";
export const FEEDS = {
  entrance: `${CDN}/fc2e631b-2659-484d-895e-e7f2daf9ec8d/_result.png`,
  lobby: `${CDN}/0d3bb8c6-3fe9-4454-8dff-13495bf4bc8e/_result.png`,
  parking: `${CDN}/335884bc-aa63-4ac2-84ca-6b027fb5ee95/_result.png`,
  corridor: `${CDN}/47090b62-68c3-46ff-a8f0-c6a47f284fbf/_result.png`,
};

/* ---------------- color / status metadata ---------------- */

export const SEV: Record<Severity | "SAFE", { color: string; bg: string; label: string }> = {
  SAFE:     { color: "#20E3A2", bg: "rgba(32,227,162,0.12)", label: "SAFE" },
  LOW:      { color: "#FBBF24", bg: "rgba(251,191,36,0.12)", label: "LOW" },
  MEDIUM:   { color: "#FF9F1C", bg: "rgba(255,159,28,0.12)", label: "MEDIUM" },
  HIGH:     { color: "#FF3B4D", bg: "rgba(255,59,77,0.13)",  label: "HIGH" },
  CRITICAL: { color: "#FF1744", bg: "rgba(255,23,68,0.16)",  label: "CRITICAL" },
};

export const THREAT_KEYWORDS = ["gun", "weapon", "firearm", "pistol", "rifle", "shotgun", "revolver", "firearms"];
export const KNIFE_KEYWORDS = ["knife", "blade", "dagger", "sword", "machete"];

export function classColor(label: string): string {
  const l = label.toLowerCase();
  if (THREAT_KEYWORDS.some((k) => l.includes(k))) return "#FF3B4D";
  if (KNIFE_KEYWORDS.some((k) => l.includes(k))) return "#FF9F1C";
  return "#FBBF24";
}

export function isThreatClass(label: string, extra: string[] = []): boolean {
  const l = label.toLowerCase();
  return [...THREAT_KEYWORDS, ...KNIFE_KEYWORDS, ...extra.map((x) => x.toLowerCase())].some((k) => l.includes(k));
}

export function severityFor(label: string, conf: number): Severity {
  const l = label.toLowerCase();
  const weapon = THREAT_KEYWORDS.some((k) => l.includes(k));
  if (weapon) return conf >= 0.88 ? "CRITICAL" : conf >= 0.75 ? "HIGH" : "MEDIUM";
  if (conf >= 0.9) return "HIGH";
  if (conf >= 0.75) return "MEDIUM";
  return "LOW";
}

/* ---------------- formatting helpers ---------------- */

export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
export const pad2 = (n: number) => String(n).padStart(2, "0");

export function fmtClock(ts: number) {
  const d = new Date(ts);
  let h = d.getHours();
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${pad2(h)}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())} ${ap}`;
}

export function fmtTime(ts: number) {
  const d = new Date(ts);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

export function fmtDateTime(ts: number) {
  const d = new Date(ts);
  return `${pad2(d.getDate())} ${d.toLocaleString("en", { month: "short" })} ${d.getFullYear()} — ${fmtTime(ts)}`;
}

export function fmtStamp(ts: number) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${fmtTime(ts)}`;
}

export function timeAgo(ts: number, now: number) {
  const s = Math.max(1, Math.floor((now - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  const mm = Math.floor(s / 60);
  if (mm < 60) return `${mm} min ago`;
  const h = Math.floor(mm / 60);
  if (h < 24) return `${h}h ${mm % 60}m ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function fmtBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

/* ---------------- exports (real file generation) ---------------- */

export function downloadBlob(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function incidentsToCsv(list: Incident[]) {
  const head = "Incident ID,Timestamp,Detection,Confidence (%),Source,Location,Severity,Status,Model";
  const rows = list.map((i) =>
    [i.id, fmtStamp(i.time), i.label, i.confidence.toFixed(1), i.sourceId, `"${i.sourceName}"`, i.severity, i.status, i.model].join(",")
  );
  return new Blob([[head, ...rows].join("\n")], { type: "text/csv;charset=utf-8" });
}

export function incidentsToPdf(list: Incident[]) {
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  const lines: string[] = [
    "SAFEHAVEN - THREAT LOG EXPORT",
    `Generated: ${fmtStamp(Date.now())}   |   Events: ${list.length}`,
    "--------------------------------------------------------------------------------",
    "ID          TIME                 DETECTION           CONF    SRC     SEV       STATUS",
  ];
  list.forEach((i) => {
    lines.push(
      `${i.id}  ${fmtStamp(i.time)}  ${i.label.padEnd(19)} ${i.confidence.toFixed(1).padStart(5)}  ${i.sourceId}  ${i.severity.padEnd(9)} ${i.status}`
    );
  });
  let content = "BT /F1 8 Tf 36 806 Td 12 TL\n";
  lines.forEach((l) => { content += `(${esc(l)}) Tj T*\n`; });
  content += "ET";
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offs: number[] = [];
  objs.forEach((o, i) => { offs.push(pdf.length); pdf += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  offs.forEach((o) => { pdf += `${String(o).padStart(10, "0")} 00000 n \n`; });
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([pdf], { type: "application/pdf" });
}
