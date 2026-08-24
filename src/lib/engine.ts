/* ---------------- SafeHaven ONNX Detection Engine ----------------
   Real in-browser inference with onnxruntime-web (WASM).
   Model source priority:
     1. Backend `server/model/` folder (auto-detected .onnx, served by Express)
     2. User-uploaded .onnx cached in IndexedDB
     3. Default YOLOv8n (COCO) from CDN — detects 80 classes incl. "knife", "person"
   The inference loop uses a busy-flag + interval throttle: a new frame is only
   processed when the previous one finished, so the UI can never hang. */

import * as ort from "onnxruntime-web";
import { fetchModelFile, getBlob } from "./api";
import { isThreatClass, type Box, type Detection } from "./data";

ort.env.wasm.numThreads = navigator.hardwareConcurrency ? Math.min(4, navigator.hardwareConcurrency) : 2;
ort.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.27.0/dist/";

export const COCO_CLASSES = ["person","bicycle","car","motorcycle","airplane","bus","train","truck","boat","traffic light","fire hydrant","stop sign","parking meter","bench","bird","cat","dog","horse","sheep","cow","elephant","bear","zebra","giraffe","backpack","umbrella","handbag","tie","suitcase","frisbee","skis","snowboard","sports ball","kite","baseball bat","baseball glove","skateboard","surfboard","tennis racket","bottle","wine glass","cup","fork","knife","spoon","bowl","banana","apple","sandwich","orange","broccoli","carrot","hot dog","pizza","donut","cake","chair","couch","potted plant","bed","dining table","toilet","tv","laptop","mouse","remote","keyboard","cell phone","microwave","oven","toaster","sink","refrigerator","book","clock","vase","scissors","teddy bear","hair drier","toothbrush"];

const DEFAULT_URLS = [
  "https://github.com/ultralytics/assets/releases/download/v0.0.0/yolov8n.onnx",
  "https://github.com/ultralytics/assets/releases/download/v8.1.0/yolov8n.onnx",
];

export interface EngineStatus {
  state: "idle" | "loading" | "ready" | "error";
  modelName: string;
  origin: "backend" | "local" | "default" | "none";
  error?: string;
  classes: string[];
}

export interface EngineMetrics { fps: number; latency: number; frames: number }

interface EngineConfig {
  confThreshold: number;
  iouThreshold: number;
  intervalMs: number;
  extraThreats: string[];
  detectPersons: boolean;
  detectWeapons: boolean;
}

let session: ort.InferenceSession | null = null;
let status: EngineStatus = { state: "idle", modelName: "—", origin: "none", classes: [] };
let cfg: EngineConfig = { confThreshold: 0.45, iouThreshold: 0.5, intervalMs: 200, extraThreats: [], detectPersons: true, detectWeapons: true };

let inputSize = 640;
let inputName = "images";
let classNames: string[] = COCO_CLASSES;

let raf = 0;
let busy = false;
let lastRun = 0;
let el: HTMLVideoElement | HTMLImageElement | null = null;
let onDetections: (d: Detection[]) => void = () => {};
let onMetrics: (m: EngineMetrics) => void = () => {};

const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

let frames = 0;
let fpsEma = 0;
let latEma = 0;
let lastFrameAt = 0;

export const engineStatus = () => status;
export const engineClasses = () => classNames;

function setStatus(s: Partial<EngineStatus>) {
  status = { ...status, ...s };
  statusListeners.forEach((fn) => fn(status));
}
const statusListeners: ((s: EngineStatus) => void)[] = [];
export function onEngineStatus(fn: (s: EngineStatus) => void) {
  statusListeners.push(fn);
  return () => { const i = statusListeners.indexOf(fn); if (i >= 0) statusListeners.splice(i, 1); };
}

export function configureEngine(partial: Partial<EngineConfig>) {
  cfg = { ...cfg, ...partial };
}

/* ---------------- model loading ---------------- */

async function createSession(buffer: ArrayBuffer, name: string, origin: EngineStatus["origin"], classes?: string[]) {
  if (session) { try { await session.release(); } catch { /* noop */ } session = null; }
  setStatus({ state: "loading", modelName: name, origin });
  try {
    session = await ort.InferenceSession.create(buffer, { executionProviders: ["wasm"], graphOptimizationLevel: "all" });
    inputName = session.inputNames[0] || "images";
    const shape = (session as unknown as { inputDimensions?: (number | string)[][] }).inputDimensions;
    const dims = shape?.[0] ?? [];
    const h = dims[2];
    inputSize = typeof h === "number" && h > 0 ? h : 640;
    canvas.width = inputSize;
    canvas.height = inputSize;
    if (classes && classes.length > 0) classNames = classes;
    else classNames = COCO_CLASSES;
    setStatus({ state: "ready", modelName: name, origin, classes: classNames.slice(0, 12), error: undefined });
  } catch (e) {
    session = null;
    setStatus({ state: "error", modelName: name, origin, error: e instanceof Error ? e.message : "Model failed to load" });
    throw e;
  }
}

export async function loadModelChain(): Promise<void> {
  // 1 — backend model folder
  const remote = await fetchModelFile();
  if (remote) {
    try {
      const raw = localStorage.getItem("sh_backend_model_classes");
      const classes = raw ? (JSON.parse(raw) as string[]) : undefined;
      await createSession(remote.buffer, remote.name, "backend", classes);
      return;
    } catch { /* try next */ }
  }
  // 2 — locally uploaded model (IndexedDB)
  const localName = localStorage.getItem("sh_local_model_name");
  if (localName) {
    const blob = await getBlob("model:onnx");
    if (blob) {
      try {
        const classesRaw = localStorage.getItem("sh_local_model_classes");
        const classes = classesRaw ? JSON.parse(classesRaw) as string[] : undefined;
        await createSession(await blob.arrayBuffer(), localName, "local", classes);
        return;
      } catch { /* try next */ }
    }
  }
  // 3 — default COCO YOLOv8n
  for (const url of DEFAULT_URLS) {
    try {
      const r = await fetch(url);
      if (!r.ok) continue;
      await createSession(await r.arrayBuffer(), "yolov8n.onnx (COCO default)", "default");
      return;
    } catch { /* try next */ }
  }
  setStatus({ state: "error", modelName: "—", origin: "none", error: "No model reachable. Upload a .onnx file or connect the backend." });
}

/* ---------------- pre / post processing ---------------- */

interface Prepared { tensor: ort.Tensor; scale: number; offX: number; offY: number; srcW: number; srcH: number }

function prepareFrame(source: CanvasImageSource, srcW: number, srcH: number): Prepared | null {
  if (!srcW || !srcH) return null;
  const S = inputSize;
  const scale = Math.min(S / srcW, S / srcH);
  const w = Math.round(srcW * scale);
  const h = Math.round(srcH * scale);
  const offX = Math.round((S - w) / 2);
  const offY = Math.round((S - h) / 2);
  ctx.fillStyle = "#727272";
  ctx.fillRect(0, 0, S, S);
  ctx.drawImage(source, offX, offY, w, h);
  const img = ctx.getImageData(0, 0, S, S).data;
  const float = new Float32Array(3 * S * S);
  for (let i = 0, p = 0; i < img.length; i += 4, p++) {
    float[p] = img[i] / 255;
    float[S * S + p] = img[i + 1] / 255;
    float[2 * S * S + p] = img[i + 2] / 255;
  }
  return { tensor: new ort.Tensor("float32", float, [1, 3, S, S]), scale, offX, offY, srcW, srcH };
}

function iou(a: Detection, b: Detection) {
  const x1 = Math.max(a.box.x, b.box.x);
  const y1 = Math.max(a.box.y, b.box.y);
  const x2 = Math.min(a.box.x + a.box.w, b.box.x + b.box.w);
  const y2 = Math.min(a.box.y + a.box.h, b.box.y + b.box.h);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const uni = a.box.w * a.box.h + b.box.w * b.box.h - inter;
  return uni > 0 ? inter / uni : 0;
}

function nms(dets: Detection[], thr: number) {
  dets.sort((a, b) => b.confidence - a.confidence);
  const keep: Detection[] = [];
  for (const d of dets) {
    if (keep.every((k) => iou(k, d) < thr)) keep.push(d);
  }
  return keep;
}

function parseOutput(out: ort.Tensor, prep: Prepared): Detection[] {
  const data = out.data as Float32Array;
  const dims = out.dims as number[];
  const raw: Detection[] = [];
  const S = inputSize;
  const toPct = (cx: number, cy: number, w: number, h: number): Box => {
    const x = (cx - w / 2 - prep.offX) / prep.scale;
    const y = (cy - h / 2 - prep.offY) / prep.scale;
    return {
      x: Math.max(0, (x / prep.srcW) * 100),
      y: Math.max(0, (y / prep.srcH) * 100),
      w: Math.min(100, (w / prep.scale / prep.srcW) * 100),
      h: Math.min(100, (h / prep.scale / prep.srcH) * 100),
    };
  };

  if (dims.length === 3 && dims[1] < dims[2]) {
    // YOLOv8: [1, 4+C, N]
    const C = dims[1] - 4;
    const N = dims[2];
    for (let i = 0; i < N; i++) {
      let best = -1, bestScore = cfg.confThreshold;
      for (let c = 0; c < C; c++) {
        const s = data[(4 + c) * N + i];
        if (s > bestScore) { bestScore = s; best = c; }
      }
      if (best < 0) continue;
      const cx = data[0 * N + i], cy = data[1 * N + i], w = data[2 * N + i], h = data[3 * N + i];
      raw.push({ label: classNames[best] ?? `class_${best}`, confidence: bestScore, box: toPct(cx, cy, w, h), isThreat: false });
    }
  } else if (dims.length === 3) {
    // YOLOv5: [1, N, 4+1+C]
    const N = dims[1];
    const stride = dims[2];
    const C = stride - 5;
    for (let i = 0; i < N; i++) {
      const base = i * stride;
      const obj = data[base + 4];
      if (obj < cfg.confThreshold) continue;
      let best = -1, bestScore = cfg.confThreshold;
      for (let c = 0; c < C; c++) {
        const s = obj * data[base + 5 + c];
        if (s > bestScore) { bestScore = s; best = c; }
      }
      if (best < 0) continue;
      raw.push({ label: classNames[best] ?? `class_${best}`, confidence: bestScore, box: toPct(data[base], data[base + 1], data[base + 2], data[base + 3]), isThreat: false });
    }
  }

  const filtered = raw.filter((d) => {
    const l = d.label.toLowerCase();
    if (l === "person" && !cfg.detectPersons) return false;
    if (isThreatClass(l, cfg.extraThreats)) {
      d.isThreat = cfg.detectWeapons;
      return true;
    }
    return true;
  });
  return nms(filtered, cfg.iouThreshold);
}

/* ---------------- inference loop ---------------- */

async function infer() {
  if (!session || !el) return;
  const isVideo = el instanceof HTMLVideoElement;
  const srcW = isVideo ? (el as HTMLVideoElement).videoWidth : (el as HTMLImageElement).naturalWidth;
  const srcH = isVideo ? (el as HTMLVideoElement).videoHeight : (el as HTMLImageElement).naturalHeight;
  const prep = prepareFrame(el, srcW, srcH);
  if (!prep) return;
  const t0 = performance.now();
  const feeds = await session.run({ [inputName]: prep.tensor });
  const out = feeds[Object.keys(feeds)[0]];
  const latency = performance.now() - t0;
  latEma = latEma ? latEma * 0.7 + latency * 0.3 : latency;
  const dets = parseOutput(out, prep);
  onDetections(dets);
  frames++;
  const now = performance.now();
  if (lastFrameAt) {
    const inst = 1000 / Math.max(1, now - lastFrameAt);
    fpsEma = fpsEma ? fpsEma * 0.75 + inst * 0.25 : inst;
  }
  lastFrameAt = now;
  onMetrics({ fps: +fpsEma.toFixed(1), latency: Math.round(latEma), frames });
}

function loop() {
  raf = requestAnimationFrame(loop);
  if (busy || !session || !el) return;
  const now = performance.now();
  if (now - lastRun < cfg.intervalMs) return;
  busy = true;
  lastRun = now;
  infer().finally(() => { busy = false; });
}

/* ---------------- public control ---------------- */

export function attachMedia(
  element: HTMLVideoElement | HTMLImageElement,
  handlers: { onDetections: (d: Detection[]) => void; onMetrics: (m: EngineMetrics) => void }
) {
  el = element;
  onDetections = handlers.onDetections;
  onMetrics = handlers.onMetrics;
  frames = 0; fpsEma = 0; latEma = 0; lastFrameAt = 0;
  cancelAnimationFrame(raf);
  loop();
}

export function detachMedia() {
  cancelAnimationFrame(raf);
  raf = 0;
  el = null;
}

export async function runOnce(element: HTMLVideoElement | HTMLImageElement): Promise<Detection[]> {
  if (!session) return [];
  el = element;
  await infer();
  return [];
}

export function captureFrame(maxW = 640): string {
  if (!el) return "";
  const isVideo = el instanceof HTMLVideoElement;
  const w = isVideo ? (el as HTMLVideoElement).videoWidth : (el as HTMLImageElement).naturalWidth;
  const h = isVideo ? (el as HTMLVideoElement).videoHeight : (el as HTMLImageElement).naturalHeight;
  if (!w || !h) return "";
  const c = document.createElement("canvas");
  const scale = Math.min(1, maxW / w);
  c.width = Math.round(w * scale);
  c.height = Math.round(h * scale);
  c.getContext("2d")!.drawImage(el, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.72);
}

export function captureBlob(): Promise<Blob | null> {
  return new Promise((res) => {
    if (!el) return res(null);
    const isVideo = el instanceof HTMLVideoElement;
    const w = isVideo ? (el as HTMLVideoElement).videoWidth : (el as HTMLImageElement).naturalWidth;
    const h = isVideo ? (el as HTMLVideoElement).videoHeight : (el as HTMLImageElement).naturalHeight;
    if (!w || !h) return res(null);
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    c.getContext("2d")!.drawImage(el, 0, 0);
    c.toBlob((b) => res(b), "image/png");
  });
}
