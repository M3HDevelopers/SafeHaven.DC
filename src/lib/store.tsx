import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  CAMERAS, MODELS, USERS, FEEDS, seedIncidents, severityFor, clamp, rand,
  type Box, type Camera, type Incident, type ModelInfo, type Page, type UserRec, type WeaponType,
} from "./data";

/* ---------------- types ---------------- */

export interface Toast { id: number; kind: "success" | "info" | "warning" | "error"; title: string; msg?: string }
export interface ThreatAlert { id: number; incidentId: string; at: number }
export interface Route { page: Page; tab?: string; cam?: string }
export interface Metrics { fps: number; gpu: number; cpu: number; mem: number; latency: number }
export interface ActiveThreat { inc: Incident; box: Box; cameraId: string; expires: number }

export interface Settings {
  weapon: boolean; person: boolean; future: boolean; motion: boolean; boxes: boolean; labels: boolean;
  conf: number; iou: number; cooldown: number;
  sound: boolean; sms: boolean; email: boolean; browser: boolean;
  smsCfg: { sid: string; token: string; from: string; to: string } | null;
  emailCfg: { host: string; port: string; user: string; pass: string; to: string; enc: "TLS" | "SSL" } | null;
  device: "GPU" | "CPU";
  precision: "FP16" | "FP32";
  autoupdate: boolean;
}

export const PAGE_META: Record<Page, { title: string; sub: string }> = {
  dashboard: { title: "Dashboard", sub: "Real-time security monitoring" },
  live: { title: "Live Detection", sub: "Multi-camera AI monitoring wall" },
  logs: { title: "Threat Logs", sub: "Review and investigate historical detection events" },
  cameras: { title: "Camera Management", sub: "Manage connected surveillance sources" },
  models: { title: "AI Detection Models", sub: "Manage inference models and versions" },
  analytics: { title: "Analytics", sub: "Detection intelligence and trends" },
  settings: { title: "Detection Settings", sub: "Configure detection engine behavior" },
  users: { title: "User Management", sub: "Roles, access control and sessions" },
  profile: { title: "Profile", sub: "Your account and security preferences" },
};

interface Store {
  authed: boolean;
  route: Route;
  navigate: (page: Page, opts?: Partial<Route>) => void;
  login: (name?: string) => void;
  logout: () => void;
  drawer: boolean;
  setDrawer: (v: boolean) => void;

  now: number;
  cameras: Camera[];
  incidents: Incident[];
  models: ModelInfo[];
  users: UserRec[];
  metrics: Metrics;
  sparks: { fps: number[]; gpu: number[]; cpu: number[] };
  running: boolean;
  recording: boolean;
  recStart: number;
  activeThreat: ActiveThreat | null;
  threatLevel: Incident["severity"] | "SAFE";
  criticalActive: boolean;
  alerts: ThreatAlert[];
  toasts: Toast[];
  settings: Settings;
  activeModelId: string;
  activeCamId: string;
  setActiveCamId: (id: string) => void;
  openIncidentId: string | null;
  setOpenIncidentId: (id: string | null) => void;
  fullscreen: boolean;
  setFullscreen: (v: boolean) => void;
  stats: { total: number; threatsToday: number };

  toast: (kind: Toast["kind"], title: string, msg?: string) => void;
  dismissToast: (id: number) => void;
  startDetection: () => void;
  stopDetection: () => void;
  snapshot: (camId?: string) => void;
  toggleRecord: () => void;
  dismissAlert: (id: number) => void;
  reviewIncident: (id: string) => void;
  retryCamera: (id: string) => void;
  addCamera: (c: { name: string; location: string; source: Camera["source"]; endpoint: string }) => void;
  updateCamera: (id: string, patch: Partial<Camera>) => void;
  deleteCamera: (id: string) => void;
  testConnection: (source: string, endpoint: string) => Promise<boolean>;
  activateModel: (id: string) => void;
  addModel: (m: { name: string; version: string; file: string }) => void;
  deleteModel: (id: string) => void;
  addUser: (u: { name: string; username: string; role: UserRec["role"]; email: string }) => void;
  deleteUser: (id: string) => void;
  toggleUser: (id: string) => void;
  saveSettings: (patch: Partial<Settings>, silent?: boolean) => void;
  spawnThreat: () => void;
}

const Ctx = createContext<Store | null>(null);
export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("Store missing");
  return s;
}

/* ---------------- audio cue ---------------- */

function beep() {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    [880, 622].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = f;
      const t = ctx.currentTime + i * 0.16;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.05, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(t);
      o.stop(t + 0.36);
    });
  } catch { /* audio unavailable */ }
}

const DEF_SETTINGS: Settings = {
  weapon: true, person: true, future: false, motion: true, boxes: true, labels: true,
  conf: 0.45, iou: 0.5, cooldown: 30,
  sound: true, sms: false, email: true, browser: true,
  smsCfg: null, emailCfg: null,
  device: "GPU", precision: "FP16", autoupdate: true,
};

let idSeq = 1;

/* ---------------- provider ---------------- */

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState(() => localStorage.getItem("sh_auth") === "1");
  const [route, setRoute] = useState<Route>({ page: "dashboard" });
  const [drawer, setDrawer] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [cameras, setCameras] = useState<Camera[]>(CAMERAS);
  const [incidents, setIncidents] = useState<Incident[]>(seedIncidents);
  const [models, setModels] = useState<ModelInfo[]>(MODELS);
  const [users, setUsers] = useState<UserRec[]>(USERS);
  const [metrics, setMetrics] = useState<Metrics>({ fps: 29.7, gpu: 72, cpu: 38, mem: 61, latency: 34 });
  const [sparks, setSparks] = useState({ fps: [29, 30, 29.5, 29.8, 30, 29.6, 29.7, 29.9, 29.4, 29.7], gpu: [70, 73, 71, 74, 72, 75, 72, 71, 73, 72], cpu: [36, 39, 37, 41, 38, 36, 40, 38, 37, 38] });
  const [running, setRunning] = useState(true);
  const [recording, setRecording] = useState(false);
  const [recStart, setRecStart] = useState(0);
  const [activeThreat, setActiveThreat] = useState<ActiveThreat | null>(null);
  const [criticalUntil, setCriticalUntil] = useState(0);
  const [alerts, setAlerts] = useState<ThreatAlert[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [settings, setSettings] = useState<Settings>(DEF_SETTINGS);
  const [activeModelId, setActiveModelId] = useState("MD-01");
  const [activeCamId, setActiveCamId] = useState("CAM-01");
  const [openIncidentId, setOpenIncidentId] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [stats, setStats] = useState({ total: 128, threatsToday: 23 });

  const runningRef = useRef(running);
  runningRef.current = running;
  const metricsRef = useRef(metrics);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const camerasRef = useRef(cameras);
  camerasRef.current = cameras;
  const authedRef = useRef(authed);
  authedRef.current = authed;
  const nextThreatRef = useRef(Date.now() + 14_000);
  const incSeqRef = useRef(10429);

  const toast = useCallback((kind: Toast["kind"], title: string, msg?: string) => {
    const id = idSeq++;
    setToasts((p) => [...p.slice(-3), { id, kind, title, msg }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 4000);
  }, []);

  const dismissToast = useCallback((id: number) => setToasts((p) => p.filter((t) => t.id !== id)), []);

  const navigate = useCallback((page: Page, opts?: Partial<Route>) => {
    setRoute({ page, ...opts });
    setDrawer(false);
    setFullscreen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const login = useCallback((name?: string) => {
    localStorage.setItem("sh_auth", "1");
    localStorage.setItem("sh_user", name || "Admin User");
    setAuthed(true);
    setRoute({ page: "dashboard" });
    toast("success", "Welcome back", "AI detection engine is active on 8 cameras.");
  }, [toast]);

  const logout = useCallback(() => {
    localStorage.removeItem("sh_auth");
    setAuthed(false);
  }, []);

  /* -------- threat spawning -------- */

  const spawnThreat = useCallback(() => {
    const online = camerasRef.current.filter((c) => c.status === "online");
    if (!online.length) return;
    const cam = online[Math.floor(Math.random() * online.length)];
    const r = Math.random();
    const type: WeaponType = r < 0.5 ? "Potential Weapon" : r < 0.8 ? "Knife" : "Other Threat";
    const confidence = +(type === "Potential Weapon" ? rand(88, 98.6) : type === "Knife" ? rand(82, 95.4) : rand(70, 90)).toFixed(1);
    const severity = severityFor(type, confidence);
    const inc: Incident = {
      id: `SH-${incSeqRef.current++}`,
      type, confidence,
      cameraId: cam.id,
      cameraName: `${cam.name} — ${cam.location}`,
      time: Date.now(),
      severity,
      status: "New",
      model: "Weapon Detector v2",
      box: { x: rand(30, 58), y: rand(30, 50), w: rand(13, 22), h: rand(26, 36) },
      img: cam.img,
    };
    setIncidents((p) => [inc, ...p]);
    setStats((st) => ({ total: st.total + 1 + Math.floor(rand(0, 4)), threatsToday: st.threatsToday + 1 }));
    setActiveThreat({ inc, box: inc.box, cameraId: cam.id, expires: Date.now() + 9500 });
    setAlerts((p) => [...p.slice(-2), { id: idSeq++, incidentId: inc.id, at: Date.now() }]);
    if (severity === "CRITICAL") setCriticalUntil(Date.now() + 45_000);
    if (settingsRef.current.sound) beep();
    setCameras((p) => p.map((c) => (c.id === cam.id ? { ...c, threats: c.threats + 1 } : c)));
  }, []);

  /* -------- realtime tick -------- */

  useEffect(() => {
    const t = setInterval(() => {
      const nowTs = Date.now();
      setNow(nowTs);
      const run = runningRef.current;
      const p = metricsRef.current;
      const next: Metrics = {
        fps: run ? +clamp(p.fps + rand(-0.5, 0.5), 28.4, 30.6).toFixed(1) : 0,
        gpu: run ? Math.round(clamp(p.gpu + rand(-2.4, 2.4), 63, 82)) : Math.round(clamp(p.gpu + rand(-3, 3), 12, 22)),
        cpu: run ? Math.round(clamp(p.cpu + rand(-2, 2), 31, 47)) : Math.round(clamp(p.cpu + rand(-2, 2), 7, 15)),
        mem: Math.round(clamp(p.mem + rand(-0.8, 0.8), 57, 66)),
        latency: run ? Math.round(clamp(p.latency + rand(-3, 3), 26, 44)) : 0,
      };
      metricsRef.current = next;
      setMetrics(next);
      setSparks((sp) => ({
        fps: [...sp.fps.slice(-35), next.fps],
        gpu: [...sp.gpu.slice(-35), next.gpu],
        cpu: [...sp.cpu.slice(-35), next.cpu],
      }));
      setCameras((prev) =>
        prev.map((c) =>
          c.status === "online"
            ? { ...c, lastHeartbeat: 1 + Math.floor(Math.random() * 4), fps: run ? +clamp((c.fps || 29.4) + rand(-0.3, 0.3), 28.2, 30.4).toFixed(1) : 0 }
            : { ...c, lastHeartbeat: c.lastHeartbeat + 1 }
        )
      );
      setActiveThreat((prev) => {
        if (!prev) return prev;
        if (nowTs > prev.expires) return null;
        if (Math.random() < 0.34) {
          const b = prev.box;
          return {
            ...prev,
            box: {
              x: clamp(b.x + rand(-3.5, 3.5), 12, 66),
              y: clamp(b.y + rand(-2.5, 2.5), 18, 55),
              w: clamp(b.w + rand(-1.5, 1.5), 11, 26),
              h: clamp(b.h + rand(-1.5, 1.5), 22, 40),
            },
          };
        }
        return prev;
      });
      setAlerts((p) => (p.length && nowTs - p[0].at > 12_000 ? p.slice(1) : p));
      if (authedRef.current && run && nowTs >= nextThreatRef.current) {
        const cool = Math.max(settingsRef.current.cooldown, 20);
        nextThreatRef.current = nowTs + rand(cool, cool + 20) * 1000;
        spawnThreat();
      }
    }, 1000);
    return () => clearInterval(t);
  }, [spawnThreat]);

  /* -------- actions -------- */

  const startDetection = useCallback(() => {
    setRunning(true);
    nextThreatRef.current = Date.now() + rand(9, 16) * 1000;
    toast("info", "Detection engine started", "Weapon Detector v2 · inference streaming at ~30 FPS.");
  }, [toast]);

  const stopDetection = useCallback(() => {
    setRunning(false);
    setActiveThreat(null);
    toast("warning", "Detection paused", "Live analysis is suspended. Cameras remain connected.");
  }, [toast]);

  const snapshot = useCallback((camId?: string) => {
    const cam = cameras.find((c) => c.id === (camId || activeCamId));
    if (!cam) return;
    fetch(cam.img)
      .then((r) => r.blob())
      .then((b) => {
        const url = URL.createObjectURL(b);
        const a = document.createElement("a");
        a.href = url;
        a.download = `safehaven_${cam.id}_${Date.now()}.png`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
        toast("success", "Snapshot saved", `${cam.id} frame exported to evidence storage.`);
      })
      .catch(() => {
        window.open(cam.img, "_blank", "noopener");
        toast("info", "Snapshot captured", `${cam.id} frame opened full-size in a new tab.`);
      });
  }, [cameras, activeCamId, toast]);

  const toggleRecord = useCallback(() => {
    setRecording((r) => {
      if (!r) {
        setRecStart(Date.now());
        toast("info", "Recording started", "Evidence-grade capture is running.");
      } else {
        toast("success", "Recording saved", "Clip archived to the evidence vault.");
      }
      return !r;
    });
  }, [toast]);

  const dismissAlert = useCallback((id: number) => setAlerts((p) => p.filter((a) => a.id !== id)), []);

  const reviewIncident = useCallback((id: string) => {
    setIncidents((p) => p.map((i) => (i.id === id ? { ...i, status: "Reviewed" } : i)));
    toast("success", "Incident reviewed", `${id} marked as reviewed and archived.`);
  }, [toast]);

  const retryCamera = useCallback((id: string) => {
    setTimeout(() => {
      setCameras((p) => p.map((c) => (c.id === id ? { ...c, status: "online", fps: 29.2, lastHeartbeat: 1 } : c)));
      toast("success", "Camera reconnected", `${id} heartbeat restored — stream resumed.`);
    }, 1600);
  }, [toast]);

  const addCamera = useCallback((c: { name: string; location: string; source: Camera["source"]; endpoint: string }) => {
    setCameras((p) => {
      const n = p.length + 1;
      const imgs = [FEEDS.entrance, FEEDS.lobby, FEEDS.parking, FEEDS.corridor];
      return [...p, {
        id: `CAM-${String(n).padStart(2, "0")}`,
        name: `Camera ${String(n).padStart(2, "0")}`,
        location: c.location || c.name,
        status: "online", fps: 29.3, resolution: "1920×1080",
        source: c.source, endpoint: c.endpoint || "local",
        lastHeartbeat: 1, threats: 0, img: imgs[n % 4],
      }];
    });
    toast("success", "Camera connected", "New source registered and streaming.");
  }, [toast]);

  const updateCamera = useCallback((id: string, patch: Partial<Camera>) => {
    setCameras((p) => p.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }, []);

  const deleteCamera = useCallback((id: string) => {
    setCameras((p) => p.filter((c) => c.id !== id));
    setActiveCamId((cur) => (cur === id ? CAMERAS[0].id : cur));
    toast("warning", "Camera removed", `${id} disconnected from SafeHaven.`);
  }, [toast]);

  const testConnection = useCallback((source: string, endpoint: string) => {
    return new Promise<boolean>((res) => {
      setTimeout(() => res(source === "Webcam" ? true : endpoint.trim().length > 8), 1400);
    });
  }, []);

  const activateModel = useCallback((id: string) => {
    setModels((p) => p.map((mm) => ({ ...mm, status: mm.id === id ? "ACTIVE" : mm.status === "DEPRECATED" ? "DEPRECATED" : "STANDBY" })));
    setActiveModelId(id);
    const m = MODELS.find((x) => x.id === id);
    toast("success", "Model loaded", `${m?.name ?? "Model"} is now handling inference.`);
  }, [toast]);

  const addModel = useCallback((mm: { name: string; version: string; file: string }) => {
    setModels((p) => [...p, {
      id: `MD-${String(p.length + 1).padStart(2, "0")}`,
      name: mm.name, version: mm.version, accuracy: 0, fps: 0,
      classes: ["pending calibration"], uploaded: new Date().toLocaleDateString("en", { day: "2-digit", month: "short", year: "numeric" }),
      size: mm.file || "—", status: "STANDBY",
    }]);
    toast("success", "Model uploaded", "Weights queued for validation and calibration.");
  }, [toast]);

  const deleteModel = useCallback((id: string) => {
    setModels((p) => p.filter((mm) => mm.id !== id));
    toast("warning", "Model deleted", "Inference weights removed from the model directory.");
  }, [toast]);

  const addUser = useCallback((u: { name: string; username: string; role: UserRec["role"]; email: string }) => {
    setUsers((p) => [...p, { id: `U-${String(p.length + 1).padStart(2, "0")}`, ...u, status: "Active", lastLogin: "Never" }]);
    toast("success", "User created", `${u.username} provisioned with ${u.role} access.`);
  }, [toast]);

  const deleteUser = useCallback((id: string) => {
    setUsers((p) => p.filter((u) => u.id !== id));
    toast("warning", "User removed", "Access revoked and sessions terminated.");
  }, [toast]);

  const toggleUser = useCallback((id: string) => {
    setUsers((p) => p.map((u) => (u.id === id ? { ...u, status: u.status === "Active" ? "Suspended" : "Active" } : u)));
  }, []);

  const saveSettings = useCallback((patch: Partial<Settings>, silent?: boolean) => {
    setSettings((s) => ({ ...s, ...patch }));
    if (!silent) toast("success", "Settings saved", "Configuration applied to the detection engine.");
  }, [toast]);

  const threatLevel = activeThreat ? activeThreat.inc.severity : "SAFE";
  const criticalActive = (activeThreat?.inc.severity === "CRITICAL") || now < criticalUntil;

  const value: Store = {
    authed, route, navigate, login, logout, drawer, setDrawer,
    now, cameras, incidents, models, users, metrics, sparks,
    running, recording, recStart, activeThreat, threatLevel, criticalActive,
    alerts, toasts, settings, activeModelId, activeCamId, setActiveCamId,
    openIncidentId, setOpenIncidentId, fullscreen, setFullscreen, stats,
    toast, dismissToast, startDetection, stopDetection, snapshot, toggleRecord,
    dismissAlert, reviewIncident, retryCamera, addCamera, updateCamera, deleteCamera,
    testConnection, activateModel, addModel, deleteModel, addUser, deleteUser, toggleUser,
    saveSettings, spawnThreat,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
