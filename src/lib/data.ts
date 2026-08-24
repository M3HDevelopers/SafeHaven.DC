/* ---------------- SafeHaven data layer: types, seeds, helpers ---------------- */

export type WeaponType = "Potential Weapon" | "Knife" | "Other Threat";
export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type ThreatLevel = "SAFE" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type IncidentStatus = "New" | "Reviewing" | "Reviewed";
export type Page =
  | "dashboard" | "live" | "logs" | "cameras" | "models"
  | "analytics" | "settings" | "users" | "profile";

export interface Box { x: number; y: number; w: number; h: number }

export interface Camera {
  id: string;
  name: string;
  location: string;
  status: "online" | "offline";
  fps: number;
  resolution: string;
  source: "Webcam" | "IP Camera" | "RTSP Stream" | "Video File";
  endpoint: string;
  lastHeartbeat: number; // seconds ago
  threats: number;
  img: string;
}

export interface Incident {
  id: string;
  type: WeaponType;
  confidence: number; // percent
  cameraId: string;
  cameraName: string;
  time: number; // epoch ms
  severity: Severity;
  status: IncidentStatus;
  model: string;
  box: Box;
  img: string;
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

/* ---------------- imagery ---------------- */

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

export const TYPE_COLOR: Record<WeaponType, string> = {
  "Potential Weapon": "#FF3B4D",
  Knife: "#FF9F1C",
  "Other Threat": "#FBBF24",
};

/* ---------------- seeds ---------------- */

export const CAMERAS: Camera[] = [
  { id: "CAM-01", name: "Camera 01", location: "Main Entrance", status: "online", fps: 29.7, resolution: "1920×1080", source: "IP Camera", endpoint: "rtsp://10.0.4.21:554/stream1", lastHeartbeat: 2, threats: 7, img: FEEDS.entrance },
  { id: "CAM-02", name: "Camera 02", location: "Lobby — Reception", status: "online", fps: 29.4, resolution: "1920×1080", source: "IP Camera", endpoint: "rtsp://10.0.4.22:554/stream1", lastHeartbeat: 1, threats: 9, img: FEEDS.lobby },
  { id: "CAM-03", name: "Camera 03", location: "Parking Level B1", status: "online", fps: 28.9, resolution: "2560×1440", source: "RTSP Stream", endpoint: "rtsp://10.0.4.31:554/cam/realmonitor", lastHeartbeat: 3, threats: 4, img: FEEDS.parking },
  { id: "CAM-04", name: "Camera 04", location: "East Corridor", status: "online", fps: 30.0, resolution: "1920×1080", source: "IP Camera", endpoint: "rtsp://10.0.4.24:554/stream1", lastHeartbeat: 2, threats: 3, img: FEEDS.corridor },
  { id: "CAM-05", name: "Camera 05", location: "Loading Dock", status: "offline", fps: 0, resolution: "1920×1080", source: "RTSP Stream", endpoint: "rtsp://10.0.4.35:554/dock", lastHeartbeat: 847, threats: 0, img: FEEDS.parking },
  { id: "CAM-06", name: "Camera 06", location: "Server Room", status: "online", fps: 29.8, resolution: "1920×1080", source: "Webcam", endpoint: "/dev/video2", lastHeartbeat: 1, threats: 0, img: FEEDS.corridor },
  { id: "CAM-07", name: "Camera 07", location: "North Stairwell", status: "online", fps: 29.2, resolution: "1280×720", source: "IP Camera", endpoint: "rtsp://10.0.4.27:554/stream1", lastHeartbeat: 4, threats: 0, img: FEEDS.entrance },
  { id: "CAM-08", name: "Camera 08", location: "Cafeteria", status: "online", fps: 29.6, resolution: "1920×1080", source: "IP Camera", endpoint: "rtsp://10.0.4.28:554/stream1", lastHeartbeat: 2, threats: 0, img: FEEDS.lobby },
  { id: "CAM-09", name: "Camera 09", location: "Rooftop Access", status: "offline", fps: 0, resolution: "1920×1080", source: "RTSP Stream", endpoint: "rtsp://10.0.4.39:554/roof", lastHeartbeat: 3612, threats: 0, img: FEEDS.parking },
  { id: "CAM-10", name: "Camera 10", location: "West Perimeter", status: "online", fps: 28.7, resolution: "2560×1440", source: "RTSP Stream", endpoint: "rtsp://10.0.4.40:554/perim", lastHeartbeat: 3, threats: 0, img: FEEDS.corridor },
];

export const MODELS: ModelInfo[] = [
  { id: "MD-01", name: "Weapon Detector", version: "v2.1.0", accuracy: 92.8, fps: 29.7, classes: ["firearm", "knife", "blunt object", "concealed"], uploaded: "14 Jun 2026", size: "48.2 MB", status: "ACTIVE" },
  { id: "MD-02", name: "Person Detector", version: "v1.4.2", accuracy: 96.1, fps: 42.0, classes: ["person", "crowd", "posture"], uploaded: "02 May 2026", size: "31.7 MB", status: "STANDBY" },
  { id: "MD-03", name: "Firearm Classifier", version: "v3.0.0-beta", accuracy: 94.9, fps: 27.3, classes: ["handgun", "rifle", "holstered"], uploaded: "28 Jul 2026", size: "52.9 MB", status: "STANDBY" },
  { id: "MD-04", name: "Motion Tracker", version: "v0.9.8", accuracy: 88.4, fps: 60.0, classes: ["motion", "loitering", "trajectory"], uploaded: "19 Jan 2026", size: "12.4 MB", status: "DEPRECATED" },
];

export const USERS: UserRec[] = [
  { id: "U-01", name: "Admin User", username: "admin", role: "ADMIN", status: "Active", lastLogin: "Today, 00:12", email: "admin@safehaven.ai" },
  { id: "U-02", name: "Sarah Mitchell", username: "s.mitchell", role: "OPERATOR", status: "Active", lastLogin: "Yesterday, 22:41", email: "s.mitchell@safehaven.ai" },
  { id: "U-03", name: "David Chen", username: "d.chen", role: "OPERATOR", status: "Active", lastLogin: "20 Aug 2026, 18:05", email: "d.chen@safehaven.ai" },
  { id: "U-04", name: "Lena Ortiz", username: "l.ortiz", role: "VIEWER", status: "Suspended", lastLogin: "03 Aug 2026, 09:27", email: "l.ortiz@safehaven.ai" },
];

/* incidents seeded relative to load time */
const m = 60_000;
type Row = [number, WeaponType, number, number, Severity, IncidentStatus];
const ROWS: Row[] = [
  [4, "Potential Weapon", 94.8, 1, "HIGH", "New"],
  [18, "Knife", 91.2, 1, "HIGH", "New"],
  [37, "Potential Weapon", 96.4, 3, "CRITICAL", "Reviewing"],
  [66, "Other Threat", 84.1, 0, "MEDIUM", "Reviewed"],
  [95, "Potential Weapon", 89.7, 2, "HIGH", "Reviewed"],
  [132, "Knife", 87.3, 7, "MEDIUM", "Reviewed"],
  [178, "Other Threat", 76.9, 1, "LOW", "Reviewed"],
  [240, "Potential Weapon", 95.6, 0, "CRITICAL", "Reviewed"],
  [310, "Knife", 90.4, 3, "HIGH", "Reviewed"],
  [402, "Other Threat", 81.2, 2, "MEDIUM", "Reviewed"],
  [498, "Potential Weapon", 93.1, 1, "HIGH", "Reviewed"],
  [610, "Other Threat", 72.4, 0, "LOW", "Reviewed"],
  [742, "Knife", 88.9, 3, "HIGH", "Reviewed"],
  [880, "Potential Weapon", 97.2, 1, "CRITICAL", "Reviewed"],
  [1040, "Other Threat", 79.5, 2, "MEDIUM", "Reviewed"],
  [1230, "Knife", 85.2, 0, "MEDIUM", "Reviewed"],
  [1470, "Potential Weapon", 92.0, 3, "HIGH", "Reviewed"],
  [1755, "Other Threat", 74.8, 1, "LOW", "Reviewed"],
];

export function seedIncidents(): Incident[] {
  const now = Date.now();
  return ROWS.map((r, i) => {
    const cam = CAMERAS[r[3]];
    return {
      id: `SH-${10428 - i}`,
      type: r[1],
      confidence: r[2],
      cameraId: cam.id,
      cameraName: `${cam.name} — ${cam.location}`,
      time: now - r[0] * m,
      severity: r[4],
      status: r[5],
      model: "Weapon Detector v2",
      box: { x: 34 + ((i * 7) % 26), y: 32 + ((i * 11) % 22), w: 16 + ((i * 3) % 8), h: 28 + ((i * 5) % 8) },
      img: cam.img,
    };
  });
}

/* ---------------- analytics seeds ---------------- */

export const DET_24 = [2, 1, 1, 0, 1, 2, 3, 5, 8, 9, 7, 6, 9, 11, 8, 6, 7, 10, 12, 9, 6, 4, 3, 2];
export const THR_24 = [0, 0, 1, 0, 0, 0, 1, 0, 1, 2, 0, 1, 1, 2, 1, 0, 1, 2, 3, 1, 0, 1, 0, 0];
export const DET_7 = [14, 18, 11, 22, 17, 9, 16];
export const THR_7 = [2, 4, 1, 5, 3, 1, 3];
export const DET_30 = [8, 11, 9, 14, 12, 7, 10, 15, 13, 9, 12, 16, 11, 8, 14, 17, 10, 12, 15, 19, 13, 11, 16, 14, 12, 18, 15, 13, 17, 21];
export const THR_30 = DET_30.map((v, i) => (i % 4 === 1 ? Math.round(v / 5) : i % 3 === 0 ? Math.round(v / 7) : 0));

export const CAM_COMPARE = [
  { label: "CAM-02", v: 9 }, { label: "CAM-01", v: 7 }, { label: "CAM-03", v: 4 },
  { label: "CAM-04", v: 3 }, { label: "CAM-08", v: 2 }, { label: "CAM-07", v: 1 },
];

export const HOUR_THREATS = [1, 0, 1, 0, 0, 0, 1, 1, 2, 3, 1, 2, 2, 3, 2, 1, 2, 3, 4, 2, 1, 2, 1, 1];

export const CONF_DIST = [
  { label: "70–79", v: 14 }, { label: "80–89", v: 27 }, { label: "90–94", v: 31 },
  { label: "95–97", v: 19 }, { label: "98+", v: 8 },
];

export const CATEGORIES = [
  { label: "Potential Weapon", v: 62, color: "#FF3B4D" },
  { label: "Knife", v: 31, color: "#FF9F1C" },
  { label: "Other Threat", v: 18, color: "#FBBF24" },
];

/* ---------------- small helpers ---------------- */

export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
export const rand = (a: number, b: number) => a + Math.random() * (b - a);
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

export function severityFor(type: WeaponType, conf: number): Severity {
  if (type === "Potential Weapon") return conf >= 95 ? "CRITICAL" : conf >= 88 ? "HIGH" : "MEDIUM";
  if (type === "Knife") return conf >= 92 ? "HIGH" : conf >= 84 ? "MEDIUM" : "LOW";
  return conf >= 85 ? "MEDIUM" : "LOW";
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
  const head = "Incident ID,Timestamp,Detection,Confidence (%),Camera,Location,Severity,Status,Model";
  const rows = list.map((i) =>
    [i.id, fmtStamp(i.time), i.type, i.confidence.toFixed(1), i.cameraId, `"${i.cameraName}"`, i.severity, i.status, i.model].join(",")
  );
  return new Blob([[head, ...rows].join("\n")], { type: "text/csv;charset=utf-8" });
}

export function incidentsToPdf(list: Incident[]) {
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  const lines: string[] = [
    "SAFEHAVEN - THREAT LOG EXPORT",
    `Generated: ${fmtStamp(Date.now())}   |   Events: ${list.length}`,
    "--------------------------------------------------------------------------------",
    "ID          TIME                 DETECTION           CONF    CAM     SEV       STATUS",
  ];
  list.forEach((i) => {
    lines.push(
      `${i.id}  ${fmtStamp(i.time)}  ${i.type.padEnd(19)} ${i.confidence.toFixed(1).padStart(5)}  ${i.cameraId}  ${i.severity.padEnd(9)} ${i.status}`
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
