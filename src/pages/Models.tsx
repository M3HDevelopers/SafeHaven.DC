import React, { useRef, useState } from "react";
import { Upload, Trash2, Layers, CheckCircle2, AlertTriangle, FolderOpen, Loader2, Play, Cpu, RefreshCw } from "lucide-react";
import { useStore } from "../lib/store";
import { Card, CardHead, Button, ConfirmModal, Modal, ModalHead, Field, Input, cx } from "../lib/ui";
import type { ModelInfo } from "../lib/data";

function UploadModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const s = useStore();
  const onnxIn = useRef<HTMLInputElement>(null);
  const clsIn = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [classes, setClasses] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    if (!file) return;
    setBusy(true);
    setErr("");
    try {
      const list = classes.split(",").map((x) => x.trim()).filter(Boolean);
      await s.uploadModel(file, list.length ? list : undefined);
      onClose();
      setFile(null);
      setClasses("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} width="max-w-md">
      <ModalHead title="UPLOAD MODEL" sub="ONNX weights for the browser inference engine" onClose={onClose} />
      <div className="space-y-4 p-6">
        <input ref={onnxIn} type="file" accept=".onnx" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <button onClick={() => onnxIn.current?.click()} className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-line bg-ink px-6 py-7 transition-colors duration-150 hover:border-pri/50 hover:bg-pri/4">
          <Upload size={19} className="text-pri" />
          <span className="text-[13px] font-semibold text-t1">{file ? file.name : "Select .onnx model file"}</span>
          <span className="font-mono text-[10px] text-t3">{file ? `${(file.size / 1048576).toFixed(1)} MB` : "YOLOv5 / YOLOv8 exports supported"}</span>
        </button>
        <Field label="Class Names (optional)" hint="Comma-separated, in model output order. Leave empty for COCO (80 classes) or if a classes file ships with the model on the backend.">
          <Input value={classes} onChange={(e) => setClasses(e.target.value)} placeholder="firearm, knife, person" />
        </Field>
        <p className="rounded-lg border border-line bg-ink px-3.5 py-2.5 text-[11px] leading-relaxed text-t3">
          Classes matching <span className="font-mono text-threat">gun / weapon / firearm</span> and <span className="font-mono text-warn">knife / blade</span> automatically raise threat incidents with alerts.
        </p>
        {err && <p className="rounded-lg border border-threat/40 bg-threat/10 px-3.5 py-2.5 text-[12px] text-threat">{err}</p>}
      </div>
      <div className="flex justify-end gap-2.5 border-t border-line px-6 py-4">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" disabled={!file || busy} onClick={submit}>
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} Upload & Load
        </Button>
      </div>
    </Modal>
  );
}

function ModelCard({ m, activeEngine }: { m: ModelInfo; activeEngine: string }) {
  const s = useStore();
  const [confirm, setConfirm] = useState(false);
  const isLoaded = s.engine.state === "ready" && s.engine.modelName === m.name;
  return (
    <Card hover className="flex flex-col p-4">
      <div className="flex items-start justify-between gap-3">
        <span className={cx("flex h-11 w-11 items-center justify-center rounded-xl border", m.origin === "default" ? "border-line bg-ink text-t2" : "border-pri/40 bg-pri/8 text-pri")}>
          <Layers size={16} />
        </span>
        <div className="flex items-center gap-2">
          {isLoaded ? (
            <span className="flex items-center gap-1.5 rounded-md border border-safe/30 bg-safe/10 px-2 py-1 font-mono text-[9.5px] font-bold text-safe">
              <span className="anim-pulse-soft h-1.5 w-1.5 rounded-full bg-safe" /> LOADED IN ENGINE
            </span>
          ) : (
            <span className="rounded-md border border-line bg-ink px-2 py-1 font-mono text-[9.5px] font-semibold text-t3">{m.status}</span>
          )}
          <span className="rounded-md border border-line bg-ink px-2 py-1 font-mono text-[9.5px] text-t2">{m.origin.toUpperCase()}</span>
        </div>
      </div>
      <div className="mt-3.5 min-w-0">
        <p className="truncate text-[14px] font-bold text-t1" title={m.name}>{m.name}</p>
        <p className="font-mono text-[10.5px] tracking-wider text-pri">{m.version} · {m.size}</p>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-line pt-3 font-mono text-[10.5px]">
        <span className="text-t3">ACCURACY <span className="ml-1 text-t2">{m.accuracy ? `${m.accuracy.toFixed(1)}%` : "—"}</span></span>
        <span className="text-t3">SPEED <span className="ml-1 text-t2">{m.fps ? `${m.fps} FPS` : "—"}</span></span>
        <span className="text-t3">UPLOADED <span className="ml-1 text-t2">{m.uploaded}</span></span>
        <span className="truncate text-t3">CLASSES <span className="ml-1 text-t2">{m.classes.slice(0, 2).join(", ")}{m.classes.length > 2 ? "…" : ""}</span></span>
      </div>
      <div className="mt-4 flex gap-2">
        {m.origin === "default" ? (
          <Button variant="secondary" size="sm" className="flex-1" onClick={() => void s.useDefaultModel()}><Play size={13} /> USE DEFAULT</Button>
        ) : (
          <Button variant={isLoaded ? "outline" : "primary"} size="sm" className="flex-1" disabled={isLoaded} onClick={() => void s.activateModel(m.id)}>
            {isLoaded ? <><CheckCircle2 size={13} /> ACTIVE</> : <><Play size={13} /> ACTIVATE</>}
          </Button>
        )}
        {m.origin !== "default" && (
          <Button variant="ghost" size="sm" className="text-threat hover:bg-threat/10" onClick={() => setConfirm(true)} aria-label={`Delete ${m.name}`}>
            <Trash2 size={13} />
          </Button>
        )}
      </div>
      {m.origin !== "default" && (
        <ConfirmModal
          open={confirm}
          title={`Delete ${m.name}?`}
          body="The model weights will be removed and the engine will fall back to the next available model."
          onCancel={() => setConfirm(false)}
          onConfirm={() => { setConfirm(false); void s.deleteModel(m.id); }}
        />
      )}
      <span className="sr-only">{activeEngine}</span>
    </Card>
  );
}

export default function Models() {
  const s = useStore();
  const [upload, setUpload] = useState(false);
  const e = s.engine;

  return (
    <div className="space-y-5">
      <Card>
        <CardHead title="INFERENCE ENGINE" sub="Model source priority: backend model/ folder → uploaded file → bundled default" right={
          <Button variant="secondary" size="sm" onClick={() => void s.refreshModels()}><RefreshCw size={13} /> RESCAN</Button>
        } />
        <div className="grid grid-cols-1 gap-3 p-5 md:grid-cols-4">
          <div className="rounded-xl border border-line bg-ink p-4">
            <p className="font-mono text-[9.5px] font-semibold tracking-[0.16em] text-t3">STATUS</p>
            <p className={cx("mt-1.5 flex items-center gap-2 font-mono text-[13px] font-bold", e.state === "ready" ? "text-safe" : e.state === "loading" ? "text-pri" : "text-threat")}>
              {e.state === "loading" ? <Loader2 size={13} className="animate-spin" /> : <span className={cx("h-2 w-2 rounded-full", e.state === "ready" ? "anim-pulse-soft bg-safe" : "bg-threat")} />}
              {e.state.toUpperCase()}
            </p>
          </div>
          <div className="rounded-xl border border-line bg-ink p-4">
            <p className="font-mono text-[9.5px] font-semibold tracking-[0.16em] text-t3">ACTIVE MODEL</p>
            <p className="mt-1.5 truncate font-mono text-[13px] font-bold text-t1" title={e.modelName}>{e.modelName}</p>
          </div>
          <div className="rounded-xl border border-line bg-ink p-4">
            <p className="font-mono text-[9.5px] font-semibold tracking-[0.16em] text-t3">LIVE INFERENCE</p>
            <p className="mt-1.5 font-mono text-[13px] font-bold text-pri">{s.metrics.fps.toFixed(1)} FPS · {s.metrics.latency}ms</p>
          </div>
          <div className="rounded-xl border border-line bg-ink p-4">
            <p className="font-mono text-[9.5px] font-semibold tracking-[0.16em] text-t3">RUNTIME</p>
            <p className="mt-1.5 font-mono text-[13px] font-bold text-t2">ONNX · WASM · {navigator.hardwareConcurrency ?? 4}T</p>
          </div>
        </div>
        {e.state === "error" && (
          <div className="mx-5 mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-threat/40 bg-threat/8 px-4 py-3.5">
            <AlertTriangle size={16} className="text-threat" />
            <p className="flex-1 text-[12.5px] text-t1">
              <span className="font-bold">AI Detection Engine Unavailable.</span>{" "}
              <span className="text-t3">{e.error} Paste your <span className="font-mono text-t2">.onnx</span> into <span className="font-mono text-t2">server/model/</span> and restart, or upload below.</span>
            </p>
            <Button variant="danger" size="sm" onClick={() => setUpload(true)}>UPLOAD MODEL</Button>
          </div>
        )}
      </Card>

      <Card className="flex flex-wrap items-center gap-4 border-pri/25 bg-pri/4 p-5">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-pri/40 bg-pri/10 text-pri"><FolderOpen size={18} /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-bold text-t1">Backend <span className="font-mono text-pri">model/</span> folder — auto detection</p>
          <p className="mt-0.5 text-[12px] leading-relaxed text-t3">
            Paste any <span className="font-mono text-t2">.onnx</span> file into <span className="font-mono text-t2">server/model/</span> — the backend registers it on startup, watches the folder for new files, and serves it to this engine automatically. Add a matching <span className="font-mono text-t2">.classes.txt</span> for custom class names.
          </p>
        </div>
        <Button variant="primary" onClick={() => setUpload(true)}><Upload size={15} /> UPLOAD MODEL</Button>
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-[15px] font-bold text-t1"><Cpu size={16} className="text-pri" /> Available Models <span className="font-mono text-[11px] text-t3">({s.models.length})</span></h2>
      </div>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {s.models.map((m) => <ModelCard key={m.id} m={m} activeEngine={e.modelName} />)}
      </div>

      <UploadModal open={upload} onClose={() => setUpload(false)} />
    </div>
  );
}
