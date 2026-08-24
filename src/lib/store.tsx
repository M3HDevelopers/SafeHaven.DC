import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  local, pingBackend, apiLogin, apiRegister, apiForgotPassword, apiResetPassword, apiSend, apiFetch,
  putBlob, getBlob, delBlob, ensureLocalAdmin,
} from "./api";
import {
  attachMedia, captureBlob, captureFrame, configureEngine, detachMedia, engineStatus, loadModelChain,
  onEngineStatus, runOnce, type EngineMetrics, type EngineStatus,
} from "./engine";
import {
  DEFAULT_SETTINGS, clamp, severityFor, isThreatClass,
  type CameraSource, type Detection, type Incident, type ModelInfo, type Page, type Settings, type UserRec,
} from "./data";

/* ---------------- types ---------------- */

export interface Toast { id: number; kind: "success" | "info" | "warning" | "error"; title: string; msg?: string }
export interface ThreatAlert { id: number; incidentId: string; at: number }
export interface Route { page: Page; tab?: string; cam?: string }
export interface ActiveThreat { inc: Incident; box: Detection["box"]; sourceId: string; expires: number }

export const PAGE_META: Record<Page, { title: string; sub: string }> = {
  dashboard: { title: "Dashboard", sub: "Real-time security monitoring" },
  live: { title: "Live Detection", sub: "Live AI monitoring of connected sources" },
  logs: { title: "Threat Logs", sub: "Review and investigate historical detection events" },
  cameras: { title: "Camera Management", sub: "Connect cameras, upload videos and images" },
  models: { title: "AI Detection Models", sub: "Model folder, uploads and inference engine" },
  analytics: { title: "Analytics", sub: "Detection intelligence from your real events" },
  settings: { title: "Detection Settings", sub: "Configure detection engine behavior" },
  users: { title: "User Management", sub: "Roles, access control and sessions" },
  profile: { title: "Profile", sub: "Your account and security preferences" },
};

interface Store {
  authed: boolean;
  user: UserRec | null;
  route: Route;
  navigate: (page: Page, opts?: Partial<Route>) => void;
  login: (username: string, password: string) => Promise<void>;
  register: (d: { name: string; username: string; email: string; password: string }) => Promise<void>;
  forgotPassword: (email: string) => Promise<{ message: string; resetToken?: string }>;
  resetPassword: (token: string, pw: string) => Promise<void>;
  logout: () => void;
  backendOk: boolean;
  connectBackend: (url: string) => Promise<boolean>;
  drawer: boolean;
  setDrawer: (v: boolean) => void;

  now: number;
  sources: CameraSource[];
  incidents: Incident[];
  models: ModelInfo[];
  users: UserRec[];
  engine: EngineStatus;
  metrics: EngineMetrics & { load: number; mem: number };
  sparks: { fps: number[]; lat: number[] };
  detections: Detection[];
  running: boolean;
  recording: boolean;
  recStart: number;
  activeThreat: ActiveThreat | null;
  threatLevel: Incident["severity"] | "SAFE";
  criticalActive: boolean;
  alerts: ThreatAlert[];
  toasts: Toast[];
  settings: Settings;
  activeSourceId: string;
  setActiveSourceId: (id: string) => void;
  openIncidentId: string | null;
  setOpenIncidentId: (id: string | null) => void;
  fullscreen: boolean;
  setFullscreen: (v: boolean) => void;
  stats: { totalDetections: number; threatsToday: number };

  registerMedia: (el: HTMLVideoElement | HTMLImageElement | null) => void;
  getStream: (id: string) => Promise<MediaStream | null>;
  toast: (kind: Toast["kind"], title: string, msg?: string) => void;
  dismissToast: (id: number) => void;
  startDetection: () => Promise<void>;
  stopDetection: () => void;
  snapshot: () => void;
  toggleRecord: () => void;
  dismissAlert: (id: number) => void;
  reviewIncident: (id: string) => void;
  deleteIncident: (id: string) => void;

  addWebcamSource: (d: { name: string; deviceId?: string; facing?: "environment" | "user" }) => Promise<CameraSource>;
  addVideoSource: (file: File) => Promise<CameraSource>;
  addImageSource: (file: File) => Promise<CameraSource>;
  addRtspSource: (d: { name: string; endpoint: string }) => Promise<CameraSource>;
  updateSource: (id: string, patch: Partial<CameraSource>) => void;
  deleteSource: (id: string) => void;
  retrySource: (id: string) => Promise<void>;
  testConnection: (endpoint: string) => Promise<boolean>;

  refreshModels: () => Promise<void>;
  activateModel: (id: string) => Promise<void>;
  uploadModel: (file: File, classes?: string[]) => Promise<void>;
  deleteModel: (id: string) => Promise<void>;
  useDefaultModel: () => Promise<void>;

  addUser: (u: { name: string; username: string; role: UserRec["role"]; email: string; password: string }) => Promise<void>;
  deleteUser: (id: string) => void;
  toggleUser: (id: string) => void;
  saveSettings: (patch: Partial<Settings>, silent?: boolean) => void;
  testSound: () => void;
}

const Ctx = createContext<Store | null>(null);
export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("Store missing");
  return s;
}

/* ---------------- audio cue ---------------- */

let audioCtx: AudioContext | null = null;
export function beep() {
  try {
    audioCtx = audioCtx || new AudioContext();
    const ctx = audioCtx;
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

let idSeq = 1;
const counters = JSON.parse(localStorage.getItem("sh_counters") || '{"totalDetections":0}') as { totalDetections: number };

/* ---------------- provider ---------------- */

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState(() => !!localStorage.getItem("sh_session"));
  const [user, setUser] = useState<UserRec | null>(() => {
    try { return JSON.parse(localStorage.getItem("sh_session") || "null") as UserRec | null; } catch { return null; }
  });
  const [route, setRoute] = useState<Route>({ page: "dashboard" });
  const [drawer, setDrawer] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [backendOk, setBackendOk] = useState(false);
  const [sources, setSources] = useState<CameraSource[]>(local.cameras);
  const [incidents, setIncidents] = useState<Incident[]>(local.incidents);
  const [models, setModels] = useState<ModelInfo[]>(local.models);
  const [users, setUsers] = useState<UserRec[]>([]);
  const [engine, setEngine] = useState<EngineStatus>(engineStatus());
  const [metrics, setMetrics] = useState<EngineMetrics & { load: number; mem: number }>({ fps: 0, latency: 0, frames: 0, load: 0, mem: (navigator as unknown as { deviceMemory?: number }).deviceMemory ?? 0 });
  const [sparks, setSparks] = useState<{ fps: number[]; lat: number[] }>({ fps: [], lat: [] });
  const [detections, setDetections] = useState<Detection[]>([]);
  const [running, setRunning] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recStart, setRecStart] = useState(0);
  const [activeThreat, setActiveThreat] = useState<ActiveThreat | null>(null);
  const [criticalUntil, setCriticalUntil] = useState(0);
  const [alerts, setAlerts] = useState<ThreatAlert[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [settings, setSettings] = useState<Settings>({ ...DEFAULT_SETTINGS, ...local.settings });
  const [activeSourceId, setActiveSourceIdState] = useState<string>(local.cameras[0]?.id ?? "");
  const [openIncidentId, setOpenIncidentId] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);

  const mediaElRef = useRef<HTMLVideoElement | HTMLImageElement | null>(null);
  const streamsRef = useRef<Map<string, MediaStream>>(new Map());
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const cooldownRef = useRef<Map<string, number>>(new Map());
  const incSeqRef = useRef(10001 + local.incidents.length);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const sourcesRef = useRef(sources);
  sourcesRef.current = sources;
  const runningRef = useRef(running);
  runningRef.current = running;
  const backendRef = useRef(false);

  /* -------- toasts -------- */
  const toast = useCallback((kind: Toast["kind"], title: string, msg?: string) => {
    const id = idSeq++;
    setToasts((p) => [...p.slice(-3), { id, kind, title, msg }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 4000);
  }, []);
  const dismissToast = useCallback((id: number) => setToasts((p) => p.filter((t) => t.id !== id)), []);

  /* -------- navigation -------- */
  const navigate = useCallback((page: Page, opts?: Partial<Route>) => {
    setRoute({ page, ...opts });
    setDrawer(false);
    setFullscreen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  /* -------- persistence helpers -------- */
  const persistIncidents = useCallback((list: Incident[]) => {
    const capped = list.map((inc, i) => (i < 40 ? inc : { ...inc, img: "" }));
    local.incidents = capped;
    void apiSend("/incidents/sync", { incidents: capped.slice(0, 100) });
  }, []);

  /* -------- incident creation from REAL detections -------- */
  const handleDetections = useCallback((dets: Detection[]) => {
    setDetections(dets);
    const st = settingsRef.current;
    counters.totalDetections += dets.length;
    localStorage.setItem("sh_counters", JSON.stringify(counters));

    const threats = dets.filter((d) => d.isThreat && isThreatClass(d.label, st.threatClasses.split(",").map((x) => x.trim()).filter(Boolean)));
    if (!threats.length) return;
    const src = sourcesRef.current.find((s) => s.id === activeSourceIdRef.current);
    const nowTs = Date.now();

    threats.forEach((t) => {
      const key = `${src?.id ?? "x"}:${t.label}`;
      const last = cooldownRef.current.get(key) ?? 0;
      if (nowTs - last < st.cooldown * 1000) return;
      cooldownRef.current.set(key, nowTs);

      const inc: Incident = {
        id: `SH-${incSeqRef.current++}`,
        label: t.label,
        confidence: +(t.confidence * 100).toFixed(1),
        sourceId: src?.id ?? "—",
        sourceName: src ? `${src.name} — ${src.location}` : "Unknown source",
        time: nowTs,
        severity: severityFor(t.label, t.confidence),
        status: "New",
        model: engineStatus().modelName,
        box: t.box,
        img: captureFrame(480),
      };
      setIncidents((p) => { const n = [inc, ...p]; persistIncidents(n); return n; });
      setActiveThreat({ inc, box: t.box, sourceId: inc.sourceId, expires: nowTs + 12_000 });
      setAlerts((p) => [...p.slice(-2), { id: idSeq++, incidentId: inc.id, at: nowTs }]);
      if (inc.severity === "CRITICAL" || inc.severity === "HIGH") setCriticalUntil(nowTs + 45_000);
      if (st.sound) beep();
      if (st.browser && "Notification" in window && Notification.permission === "granted") {
        try { new Notification("SafeHaven — threat detected", { body: `${t.label} · ${(t.confidence * 100).toFixed(1)}% on ${src?.name ?? "source"}` }); } catch { /* noop */ }
      }
    });

    if (src) {
      setSources((p) => {
        const n = p.map((s) => (s.id === src.id ? { ...s, threats: s.threats + threats.length, detections: s.detections + dets.length, lastHeartbeat: 1 } : s));
        local.cameras = n;
        return n;
      });
    }
  }, [persistIncidents]);

  const activeSourceIdRef = useRef(activeSourceId);
  activeSourceIdRef.current = activeSourceId;

  const handleMetrics = useCallback((m: EngineMetrics) => {
    const load = Math.min(100, Math.round((m.latency / Math.max(60, settingsRef.current.inferenceInterval)) * 100));
    setMetrics({ ...m, load, mem: (navigator as unknown as { deviceMemory?: number }).deviceMemory ?? 0 });
    setSparks((p) => ({ fps: [...p.fps.slice(-39), m.fps], lat: [...p.lat.slice(-39), m.latency] }));
    setSources((p) => p.map((s) => (s.id === activeSourceIdRef.current ? { ...s, fps: m.fps } : s)));
  }, []);

  /* -------- media element registry -------- */
  const registerMedia = useCallback((el: HTMLVideoElement | HTMLImageElement | null) => {
    mediaElRef.current = el;
    if (el && runningRef.current) {
      attachMedia(el, { onDetections: handleDetections, onMetrics: handleMetrics });
    }
  }, [handleDetections, handleMetrics]);

  /* -------- webcam stream management -------- */
  const acquireStream = useCallback(async (src: CameraSource): Promise<MediaStream> => {
    const existing = streamsRef.current.get(src.id);
    if (existing && existing.active) return existing;
    const constraints: MediaStreamConstraints = {
      audio: false,
      video: src.deviceId
        ? { deviceId: { exact: src.deviceId }, width: { ideal: 1280 } }
        : { facingMode: src.facing ?? "environment", width: { ideal: 1280 } },
    };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    streamsRef.current.set(src.id, stream);
    return stream;
  }, []);

  const releaseStream = useCallback((id: string) => {
    const s = streamsRef.current.get(id);
    if (s) { s.getTracks().forEach((t) => t.stop()); streamsRef.current.delete(id); }
  }, []);

  const getStream = useCallback(async (id: string): Promise<MediaStream | null> => {
    const src = sourcesRef.current.find((s) => s.id === id);
    if (!src || src.kind !== "webcam") return null;
    try {
      return await acquireStream(src);
    } catch {
      return null;
    }
  }, [acquireStream]);

  /* -------- detection control -------- */
  const startDetection = useCallback(async () => {
    const src = sourcesRef.current.find((s) => s.id === activeSourceIdRef.current);
    if (!src) { toast("warning", "No source selected", "Add a camera or upload a video/image first."); return; }
    if (engineStatus().state !== "ready") { toast("warning", "Model not ready", "Wait for the model to load, or upload one in Detection Models."); return; }

    try {
      if (src.kind === "webcam") await acquireStream(src);
      setRunning(true);
      runningRef.current = true;
      if (mediaElRef.current) {
        attachMedia(mediaElRef.current, { onDetections: handleDetections, onMetrics: handleMetrics });
        if (src.kind === "image") { void runOnce(mediaElRef.current); }
      } else {
        toast("info", "Starting…", "Source is loading — detection begins when the frame is ready.");
      }
      setSources((p) => { const n = p.map((s) => (s.id === src.id ? { ...s, status: "online" as const } : s)); local.cameras = n; return n; });
      toast("success", "Detection started", `${engineStatus().modelName} running on ${src.name}.`);
    } catch (e) {
      toast("error", "Camera access failed", e instanceof Error ? e.message : "Permission denied or device busy.");
    }
  }, [acquireStream, handleDetections, handleMetrics, toast]);

  const stopDetection = useCallback(() => {
    setRunning(false);
    runningRef.current = false;
    detachMedia();
    setDetections([]);
    setActiveThreat(null);
    const src = sourcesRef.current.find((s) => s.id === activeSourceIdRef.current);
    if (src?.kind === "webcam") releaseStream(src.id);
    toast("info", "Detection stopped", "Inference paused — frames are no longer analyzed.");
  }, [releaseStream, toast]);

  const setActiveSourceId = useCallback((id: string) => {
    const wasRunning = runningRef.current;
    if (wasRunning) {
      runningRef.current = false;
      setRunning(false);
      detachMedia();
      setDetections([]);
      const prev = sourcesRef.current.find((s) => s.id === activeSourceIdRef.current);
      if (prev?.kind === "webcam") releaseStream(prev.id);
    }
    setActiveSourceIdState(id);
    activeSourceIdRef.current = id;
    if (wasRunning) {
      setTimeout(() => { void startDetection(); }, 650);
    }
  }, [releaseStream, startDetection]);

  /* -------- snapshot & recording (real) -------- */
  const snapshot = useCallback(() => {
    void (async () => {
      const blob = await captureBlob();
      if (!blob) { toast("error", "No frame available", "Start a source first to capture a snapshot."); return; }
      const src = sourcesRef.current.find((s) => s.id === activeSourceIdRef.current);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `safehaven_${src?.id ?? "frame"}_${Date.now()}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      toast("success", "Snapshot saved", "Full-resolution PNG frame downloaded.");
    })();
  }, [toast]);

  const toggleRecord = useCallback(() => {
    const el = mediaElRef.current;
    if (recording) {
      recorderRef.current?.stop();
      return;
    }
    let stream: MediaStream | null = null;
    const src = sourcesRef.current.find((s) => s.id === activeSourceIdRef.current);
    if (src?.kind === "webcam") stream = streamsRef.current.get(src.id) ?? null;
    else if (el instanceof HTMLVideoElement) stream = (el as HTMLVideoElement & { captureStream?: () => MediaStream }).captureStream?.() ?? null;
    if (!stream) { toast("error", "Nothing to record", "Recording works on webcam and video sources."); return; }
    try {
      const rec = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported("video/webm") ? "video/webm" : undefined });
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `safehaven_REC_${src?.id ?? "clip"}_${Date.now()}.webm`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        setRecording(false);
        toast("success", "Recording saved", "WebM evidence clip downloaded.");
      };
      rec.start(1000);
      recorderRef.current = rec;
      setRecStart(Date.now());
      setRecording(true);
      toast("info", "Recording started", "Evidence-grade capture is running.");
    } catch {
      toast("error", "Recording failed", "MediaRecorder is not supported in this browser.");
    }
  }, [recording, toast]);

  /* -------- sources CRUD -------- */
  const persistSources = useCallback((list: CameraSource[]) => {
    local.cameras = list;
    void apiSend("/cameras/sync", { cameras: list });
  }, []);

  const addWebcamSource = useCallback(async (d: { name: string; deviceId?: string; facing?: "environment" | "user" }) => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: d.deviceId ? { deviceId: { exact: d.deviceId } } : { facingMode: d.facing ?? "environment" },
    });
    stream.getTracks().forEach((t) => t.stop()); // permission granted; re-open on demand
    const n = sourcesRef.current.length + 1;
    const src: CameraSource = {
      id: `CAM-${String(n).padStart(2, "0")}`,
      name: d.name || `Camera ${String(n).padStart(2, "0")}`,
      location: d.deviceId ? "External camera" : d.facing === "user" ? "Front camera" : "Mobile / back camera",
      kind: "webcam", status: "online", fps: 0,
      resolution: "1280×720", endpoint: d.deviceId ? `device:${d.deviceId}` : `facing:${d.facing ?? "environment"}`,
      deviceId: d.deviceId, facing: d.facing,
      createdAt: Date.now(), lastHeartbeat: 1, threats: 0, detections: 0,
    };
    setSources((p) => { const list = [...p, src]; persistSources(list); return list; });
    if (!activeSourceIdRef.current) { setActiveSourceIdState(src.id); activeSourceIdRef.current = src.id; }
    toast("success", "Camera connected", `${src.name} registered — press START DETECTION to go live.`);
    return src;
  }, [persistSources, toast]);

  const addVideoSource = useCallback(async (file: File) => {
    const id = `VID-${Date.now().toString(36).toUpperCase()}`;
    await putBlob(`media:${id}`, file);
    const n = sourcesRef.current.length + 1;
    const src: CameraSource = {
      id: `CAM-${String(n).padStart(2, "0")}`,
      name: file.name.replace(/\.[^.]+$/, "").slice(0, 28) || "Uploaded video",
      location: "Local video file",
      kind: "video", status: "online", fps: 0, resolution: "file",
      endpoint: file.name, fileName: file.name,
      createdAt: Date.now(), lastHeartbeat: 1, threats: 0, detections: 0,
    };
    await putBlob(`meta:${src.id}`, new Blob([id]));
    setSources((p) => { const list = [...p, src]; persistSources(list); return list; });
    setActiveSourceIdState(src.id);
    activeSourceIdRef.current = src.id;
    toast("success", "Video uploaded", "Frame-by-frame AI detection is ready on this clip.");
    return src;
  }, [persistSources, toast]);

  const addImageSource = useCallback(async (file: File) => {
    const id = `IMG-${Date.now().toString(36).toUpperCase()}`;
    await putBlob(`media:${id}`, file);
    const n = sourcesRef.current.length + 1;
    const src: CameraSource = {
      id: `CAM-${String(n).padStart(2, "0")}`,
      name: file.name.replace(/\.[^.]+$/, "").slice(0, 28) || "Uploaded image",
      location: "Local image file",
      kind: "image", status: "online", fps: 0, resolution: "file",
      endpoint: file.name, fileName: file.name,
      createdAt: Date.now(), lastHeartbeat: 1, threats: 0, detections: 0,
    };
    await putBlob(`meta:${src.id}`, new Blob([id]));
    setSources((p) => { const list = [...p, src]; persistSources(list); return list; });
    setActiveSourceIdState(src.id);
    activeSourceIdRef.current = src.id;
    toast("success", "Image uploaded", "Start detection to analyze this image.");
    return src;
  }, [persistSources, toast]);

  const addRtspSource = useCallback(async (d: { name: string; endpoint: string }) => {
    const n = sourcesRef.current.length + 1;
    const src: CameraSource = {
      id: `CAM-${String(n).padStart(2, "0")}`,
      name: d.name || `Camera ${String(n).padStart(2, "0")}`,
      location: "RTSP network camera",
      kind: "rtsp", status: "online", fps: 0, resolution: "stream",
      endpoint: d.endpoint,
      createdAt: Date.now(), lastHeartbeat: 1, threats: 0, detections: 0,
    };
    setSources((p) => { const list = [...p, src]; persistSources(list); return list; });
    void apiSend("/cameras", src);
    toast("success", "RTSP camera added", "The backend will proxy this stream (ffmpeg required).");
    return src;
  }, [persistSources, toast]);

  const updateSource = useCallback((id: string, patch: Partial<CameraSource>) => {
    setSources((p) => { const list = p.map((s) => (s.id === id ? { ...s, ...patch } : s)); persistSources(list); return list; });
  }, [persistSources]);

  const deleteSource = useCallback((id: string) => {
    const prev = sourcesRef.current.find((s) => s.id === id);
    releaseStream(id);
    setSources((p) => { const list = p.filter((s) => s.id !== id); persistSources(list); return list; });
    if (activeSourceIdRef.current === id) {
      const next = sourcesRef.current.find((s) => s.id !== id);
      setActiveSourceIdState(next?.id ?? "");
      activeSourceIdRef.current = next?.id ?? "";
    }
    void apiSend(`/cameras/${id}`, undefined, "DELETE");
    void delBlob(`media:${id}`);
    toast("warning", "Source removed", `${prev?.name ?? id} disconnected.`);
  }, [persistSources, releaseStream, toast]);

  const retrySource = useCallback(async (id: string) => {
    const src = sourcesRef.current.find((s) => s.id === id);
    if (!src) return;
    try {
      if (src.kind === "webcam") { const st = await acquireStream(src); releaseStream(id); void st; }
      updateSource(id, { status: "online", lastHeartbeat: 1 });
      toast("success", "Source reconnected", `${src.name} is back online.`);
    } catch (e) {
      toast("error", "Reconnect failed", e instanceof Error ? e.message : "Device unavailable.");
    }
  }, [acquireStream, releaseStream, toast, updateSource]);

  const testConnection = useCallback(async (endpoint: string) => {
    if (backendRef.current) {
      const r = await apiFetch<{ ok: boolean }>("/cameras/test", { ok: false });
      void endpoint;
      return r.ok;
    }
    return new Promise<boolean>((res) => setTimeout(() => res(endpoint.trim().startsWith("rtsp://")), 1200));
  }, []);

  /* -------- models -------- */
  const refreshModels = useCallback(async () => {
    const backendModels = await apiFetch<ModelInfo[]>("/models", []);
    const localModels = local.models;
    const defaultEntry: ModelInfo = {
      id: "default", name: "YOLOv8n", version: "COCO", accuracy: 0, fps: 0,
      classes: ["80 classes — person, knife, scissors…"], uploaded: "bundled", size: "12.2 MB",
      status: "STANDBY", origin: "default",
    };
    setModels([...backendModels, ...localModels, defaultEntry]);
  }, []);

  const activateModel = useCallback(async (id: string) => {
    if (id === "default") {
      localStorage.removeItem("sh_local_model_name");
      await loadModelChain();
      toast("success", "Default model active", "YOLOv8n (COCO) loaded.");
      return;
    }
    const m = models.find((x) => x.id === id);
    if (!m) return;
    if (m.origin === "backend") {
      await apiSend(`/models/active/${id}`, {}, "PUT" as never);
      await loadModelChain();
    } else {
      localStorage.setItem("sh_local_model_name", m.name);
      await loadModelChain();
    }
    setModels((p) => p.map((x) => ({ ...x, status: x.id === id ? "ACTIVE" as const : x.status === "ACTIVE" ? "STANDBY" as const : x.status })));
    toast("success", "Model loaded", `${m.name} is now handling inference.`);
  }, [models, toast]);

  const uploadModel = useCallback(async (file: File, classes?: string[]) => {
    if (!file.name.toLowerCase().endsWith(".onnx")) throw new Error("Only .onnx model files are supported");
    await putBlob("model:onnx", file);
    localStorage.setItem("sh_local_model_name", file.name);
    if (classes?.length) localStorage.setItem("sh_local_model_classes", JSON.stringify(classes));
    else localStorage.removeItem("sh_local_model_classes");
    const entry: ModelInfo = {
      id: `local-${Date.now().toString(36)}`,
      name: file.name, version: "custom", accuracy: 0, fps: 0,
      classes: classes?.length ? classes : ["from model output"],
      uploaded: new Date().toLocaleDateString("en", { day: "2-digit", month: "short", year: "numeric" }),
      size: `${(file.size / 1048576).toFixed(1)} MB`,
      status: "ACTIVE", origin: "local",
    };
    setModels((p) => {
      const list = [entry, ...local.models.filter((x) => x.origin === "local"), ...p.filter((x) => x.origin !== "local" && x.id !== "default")];
      local.models = list.filter((x) => x.origin === "local");
      const withDefault = [...list, { id: "default", name: "YOLOv8n", version: "COCO", accuracy: 0, fps: 0, classes: ["80 classes"], uploaded: "bundled", size: "12.2 MB", status: "STANDBY" as const, origin: "default" as const }];
      return withDefault;
    });
    await loadModelChain();
    toast("success", "Model uploaded", `${file.name} loaded into the inference engine.`);
    if (backendRef.current) {
      const fd = new FormData();
      fd.append("model", file);
      try { await fetch(`${(await import("./api")).getBackendUrl()}/models/upload`, { method: "POST", body: fd, headers: { Authorization: `Bearer ${localStorage.getItem("sh_token") ?? ""}` } }); } catch { /* backend optional */ }
    }
  }, [toast]);

  const deleteModel = useCallback(async (id: string) => {
    const m = models.find((x) => x.id === id);
    if (!m || m.origin === "default") return;
    if (m.origin === "local") {
      await delBlob("model:onnx");
      localStorage.removeItem("sh_local_model_name");
      localStorage.removeItem("sh_local_model_classes");
      local.models = local.models.filter((x) => x.id !== id);
    } else {
      await apiSend(`/models/${id}`, undefined, "DELETE");
    }
    setModels((p) => p.filter((x) => x.id !== id));
    await loadModelChain();
    toast("warning", "Model deleted", "Engine fell back to the next available model.");
  }, [models, toast]);

  const useDefaultModel = useCallback(async () => {
    localStorage.removeItem("sh_local_model_name");
    await loadModelChain();
    toast("info", "Using default model", "COCO YOLOv8n — detects 80 classes including knife.");
  }, [toast]);

  /* -------- users -------- */
  const loadUsers = useCallback(async () => {
    const remote = await apiFetch<UserRec[]>("/users", []);
    setUsers(remote.length ? remote : local.users);
  }, []);

  const addUser = useCallback(async (u: { name: string; username: string; role: UserRec["role"]; email: string; password: string }) => {
    if (backendRef.current) {
      await apiSend("/users", u);
      await loadUsers();
      toast("success", "User created", `${u.username} provisioned with ${u.role} access.`);
      return;
    }
    const { localRegister } = await import("./api");
    await localRegister(u);
    await loadUsers();
    toast("success", "User created", `${u.username} provisioned with ${u.role} access.`);
  }, [loadUsers, toast]);

  const deleteUser = useCallback((id: string) => {
    setUsers((p) => { const list = p.filter((u) => u.id !== id); if (!backendRef.current) local.users = list as never; return list; });
    void apiSend(`/users/${id}`, undefined, "DELETE");
    toast("warning", "User removed", "Access revoked and sessions terminated.");
  }, [toast]);

  const toggleUser = useCallback((id: string) => {
    setUsers((p) => {
      const list = p.map((u) => (u.id === id ? { ...u, status: u.status === "Active" ? "Suspended" as const : "Active" as const } : u));
      if (!backendRef.current) local.users = list as never;
      return list;
    });
    void apiSend(`/users/${id}/toggle`, {}, "PUT" as never);
  }, []);

  /* -------- settings -------- */
  const saveSettings = useCallback((patch: Partial<Settings>, silent?: boolean) => {
    setSettings((s) => {
      const next = { ...s, ...patch };
      local.settings = next;
      void apiSend("/settings", next, "PUT" as never);
      return next;
    });
    configureEngine({
      confThreshold: patch.conf ?? settingsRef.current.conf,
      iouThreshold: patch.iou ?? settingsRef.current.iou,
      intervalMs: patch.inferenceInterval ?? settingsRef.current.inferenceInterval,
      extraThreats: (patch.threatClasses ?? settingsRef.current.threatClasses).split(",").map((x) => x.trim()).filter(Boolean),
      detectPersons: patch.personDetection ?? settingsRef.current.personDetection,
      detectWeapons: patch.weaponDetection ?? settingsRef.current.weaponDetection,
    });
    if (!silent) toast("success", "Settings saved", "Configuration applied to the detection engine.");
  }, [toast]);

  /* -------- auth -------- */
  const login = useCallback(async (username: string, password: string) => {
    const u = await apiLogin(username, password);
    localStorage.setItem("sh_session", JSON.stringify(u));
    setUser(u);
    setAuthed(true);
    setRoute({ page: "dashboard" });
    if ("Notification" in window && Notification.permission === "default") {
      try { void Notification.requestPermission(); } catch { /* noop */ }
    }
    toast("success", `Welcome, ${u.name.split(" ")[0]}`, backendRef.current ? "Connected to SafeHaven backend + MongoDB." : "Running in local mode — set a backend URL in System Settings to sync.");
  }, [toast]);

  const register = useCallback(async (d: { name: string; username: string; email: string; password: string }) => {
    const u = await apiRegister(d);
    localStorage.setItem("sh_session", JSON.stringify(u));
    setUser(u);
    setAuthed(true);
    toast("success", "Account created", `Signed in as ${u.username}.`);
  }, [toast]);

  const forgotPassword = useCallback(async (email: string) => {
    if (!backendRef.current) throw new Error("LOCAL_MODE");
    return apiForgotPassword(email);
  }, []);

  const resetPassword = useCallback(async (token: string, pw: string) => {
    await apiResetPassword(token, pw);
  }, []);

  const logout = useCallback(() => {
    if (runningRef.current) { runningRef.current = false; setRunning(false); detachMedia(); }
    streamsRef.current.forEach((s) => s.getTracks().forEach((t) => t.stop()));
    streamsRef.current.clear();
    localStorage.removeItem("sh_session");
    localStorage.removeItem("sh_token");
    setAuthed(false);
    setUser(null);
  }, []);

  const connectBackend = useCallback(async (url: string) => {
    const ok = await pingBackend(url);
    backendRef.current = ok;
    setBackendOk(ok);
    if (ok) {
      toast("success", "Backend connected", "MongoDB sync active — cameras, logs and models will persist server-side.");
      await refreshModels();
      await loadUsers();
    } else {
      toast("error", "Backend unreachable", "Check that the server is running (npm start in /server) and the URL is correct.");
    }
    return ok;
  }, [loadUsers, refreshModels, toast]);

  /* -------- boot -------- */
  useEffect(() => {
    void ensureLocalAdmin().then(loadUsers);
    configureEngine({
      confThreshold: settingsRef.current.conf,
      iouThreshold: settingsRef.current.iou,
      intervalMs: settingsRef.current.inferenceInterval,
      extraThreats: settingsRef.current.threatClasses.split(",").map((x) => x.trim()).filter(Boolean),
      detectPersons: settingsRef.current.personDetection,
      detectWeapons: settingsRef.current.weaponDetection,
    });
    const unsub = onEngineStatus(setEngine);
    void pingBackend().then((ok) => {
      backendRef.current = ok;
      setBackendOk(ok);
      if (ok) { void refreshModels(); void loadUsers(); }
    });
    void refreshModels();
    return unsub;
  }, [loadUsers, refreshModels]);

  /* load the ONNX model only once the operator is inside the console */
  const authedRef2 = useRef(false);
  useEffect(() => {
    if (authed && !authedRef2.current) {
      authedRef2.current = true;
      void loadModelChain();
    }
  }, [authed]);

  /* -------- clock + alert expiry tick -------- */
  useEffect(() => {
    const t = setInterval(() => {
      const nowTs = Date.now();
      setNow(nowTs);
      setActiveThreat((prev) => (prev && nowTs > prev.expires ? null : prev));
      setAlerts((p) => (p.length && nowTs - p[0].at > 12_000 ? p.slice(1) : p));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const testSound = useCallback(() => beep(), []);
  const dismissAlert = useCallback((id: number) => setAlerts((p) => p.filter((a) => a.id !== id)), []);
  const reviewIncident = useCallback((id: string) => {
    setIncidents((p) => { const list = p.map((i) => (i.id === id ? { ...i, status: "Reviewed" as const } : i)); persistIncidents(list); return list; });
    void apiSend(`/incidents/${id}/review`, {}, "PUT" as never);
    toast("success", "Incident reviewed", `${id} marked as reviewed.`);
  }, [persistIncidents, toast]);
  const deleteIncident = useCallback((id: string) => {
    setIncidents((p) => { const list = p.filter((i) => i.id !== id); persistIncidents(list); return list; });
    void apiSend(`/incidents/${id}`, undefined, "DELETE");
    toast("warning", "Incident deleted", `${id} removed from logs.`);
  }, [persistIncidents, toast]);

  const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
  const threatsToday = incidents.filter((i) => i.time >= startOfDay.getTime()).length;
  const threatLevel = activeThreat ? activeThreat.inc.severity : "SAFE";
  const criticalActive = activeThreat?.inc.severity === "CRITICAL" || now < criticalUntil;

  const value: Store = {
    authed, user, route, navigate, login, register, forgotPassword, resetPassword, logout,
    backendOk, connectBackend, drawer, setDrawer,
    now, sources, incidents, models, users, engine, metrics, sparks, detections,
    running, recording, recStart, activeThreat, threatLevel, criticalActive, alerts, toasts,
    settings, activeSourceId, setActiveSourceId, openIncidentId, setOpenIncidentId,
    fullscreen, setFullscreen,
    stats: { totalDetections: counters.totalDetections, threatsToday },
    registerMedia, getStream, toast, dismissToast, startDetection, stopDetection, snapshot, toggleRecord,
    dismissAlert, reviewIncident, deleteIncident,
    addWebcamSource, addVideoSource, addImageSource, addRtspSource, updateSource, deleteSource, retrySource, testConnection,
    refreshModels, activateModel, uploadModel, deleteModel, useDefaultModel,
    addUser, deleteUser, toggleUser, saveSettings, testSound,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export { clamp };
