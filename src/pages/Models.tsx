import React, { useState } from "react";
import { Upload, Trash2, Eye, Zap, Layers, FileUp, Cpu, Target } from "lucide-react";
import { useStore } from "../lib/store";
import { Card, Button, Modal, ModalHead, ConfirmModal, Field, Input, Dot, cx } from "../lib/ui";
import type { ModelInfo } from "../lib/data";

function StatusPillModel({ st }: { st: ModelInfo["status"] }) {
  const map = {
    ACTIVE: { c: "#20E3A2", bg: "rgba(32,227,162,0.12)" },
    STANDBY: { c: "#38BDF8", bg: "rgba(56,189,248,0.12)" },
    DEPRECATED: { c: "#64748B", bg: "rgba(100,116,139,0.14)" },
  }[st];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 font-mono text-[10px] font-bold tracking-wider" style={{ color: map.c, background: map.bg }}>
      <Dot color={map.c} pulse={st === "ACTIVE"} /> {st}
    </span>
  );
}

function UploadModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const s = useStore();
  const [name, setName] = useState("");
  const [version, setVersion] = useState("v1.0.0");
  const [file, setFile] = useState("");
  return (
    <Modal open={open} onClose={onClose} width="max-w-md">
      <ModalHead title="UPLOAD MODEL" sub="Deploy new inference weights to the engine" onClose={onClose} />
      <div className="space-y-4 p-6">
        <Field label="Model Name"><Input placeholder="e.g. Firearm Classifier" value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Version"><Input placeholder="v1.0.0" value={version} onChange={(e) => setVersion(e.target.value)} className="font-mono" /></Field>
        <Field label="Weights File" hint="Accepted formats: .onnx · .pt · .engine — validated on upload.">
          <label className="flex h-[42px] cursor-pointer items-center gap-3 rounded-lg border border-dashed border-edge bg-ink px-3.5 text-[12.5px] text-t3 transition-colors hover:border-pri/50 hover:text-t2">
            <FileUp size={15} className="text-pri" />
            <span className="truncate font-mono text-[12px]">{file || "Browse weights file…"}</span>
            <input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0]?.name ?? "")} />
          </label>
        </Field>
      </div>
      <div className="flex justify-end gap-2.5 border-t border-line px-6 py-4">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" disabled={!name.trim() || !file} onClick={() => { s.addModel({ name: name.trim(), version, file }); onClose(); setName(""); setFile(""); }}>
          <Upload size={14} /> Upload Model
        </Button>
      </div>
    </Modal>
  );
}

function ModelCard({ m }: { m: ModelInfo }) {
  const s = useStore();
  const [confirm, setConfirm] = useState(false);
  const [details, setDetails] = useState(false);
  const active = m.status === "ACTIVE";

  return (
    <Card hover className="flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[14px] font-bold tracking-wide text-t1">{m.name.toUpperCase()}</p>
          <p className="mt-0.5 font-mono text-[10.5px] text-t3">{m.version} · {m.id}</p>
        </div>
        <StatusPillModel st={m.status} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-line bg-ink px-3 py-2.5">
          <p className="font-mono text-[9px] tracking-[0.14em] text-t3">ACCURACY</p>
          <p className="mt-1 font-mono text-[16px] font-bold text-pri">{m.accuracy ? `${m.accuracy.toFixed(1)}%` : "—"}</p>
        </div>
        <div className="rounded-lg border border-line bg-ink px-3 py-2.5">
          <p className="font-mono text-[9px] tracking-[0.14em] text-t3">INFERENCE</p>
          <p className="mt-1 font-mono text-[16px] font-bold text-skyx">{m.fps ? `${m.fps.toFixed(0)} FPS` : "—"}</p>
        </div>
      </div>

      <div className="mt-3.5 flex flex-wrap gap-1.5">
        {m.classes.map((c) => (
          <span key={c} className="rounded-md border border-line bg-ink px-2 py-0.5 font-mono text-[10px] text-t2">{c}</span>
        ))}
      </div>

      <div className="mt-3.5 flex items-center justify-between border-t border-line pt-3 font-mono text-[10px] text-t3">
        <span>UPLOADED {m.uploaded.toUpperCase()}</span>
        <span>{m.size}</span>
      </div>

      <div className="mt-4 flex gap-2">
        <Button
          variant={active ? "outline" : "primary"} size="sm" className="flex-1" disabled={active}
          onClick={() => s.activateModel(m.id)}
        >
          <Zap size={12} /> {active ? "ACTIVE" : "ACTIVATE"}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setDetails(true)}><Eye size={13} /> DETAILS</Button>
        <Button
          variant="ghost" size="sm" className="text-threat hover:bg-threat/10" aria-label={`Delete ${m.name}`}
          onClick={() => {
            if (active) s.toast("error", "Cannot delete active model", "Activate another model before removing this one.");
            else setConfirm(true);
          }}
        >
          <Trash2 size={13} />
        </Button>
      </div>

      {details && (
        <Modal open onClose={() => setDetails(false)} width="max-w-md">
          <ModalHead title={m.name.toUpperCase()} sub={`${m.version} · ${m.id}`} onClose={() => setDetails(false)} />
          <div className="space-y-3 p-6">
            {([
              ["STATUS", m.status], ["ACCURACY", m.accuracy ? `${m.accuracy.toFixed(1)}%` : "Pending calibration"],
              ["INFERENCE SPEED", m.fps ? `${m.fps.toFixed(1)} FPS` : "—"], ["CLASSES", m.classes.join(", ")],
              ["UPLOADED", m.uploaded], ["WEIGHT SIZE", m.size], ["RUNTIME", "ONNX Runtime · CUDA 12.4"],
            ] as [string, string][]).map(([k, v]) => (
              <div key={k} className="flex items-start justify-between gap-4 border-b border-line/60 pb-2.5">
                <span className="font-mono text-[10px] font-semibold tracking-[0.14em] text-t3">{k}</span>
                <span className="text-right font-mono text-[12px] text-t1">{v}</span>
              </div>
            ))}
          </div>
        </Modal>
      )}
      <ConfirmModal
        open={confirm}
        title={`Delete ${m.name}?`}
        body="This permanently removes the weights from the model directory. Calibration history will be lost."
        onCancel={() => setConfirm(false)}
        onConfirm={() => { setConfirm(false); s.deleteModel(m.id); }}
      />
    </Card>
  );
}

export default function Models() {
  const s = useStore();
  const [upload, setUpload] = useState(false);
  const active = s.models.find((m) => m.id === s.activeModelId) ?? s.models[0];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-[11px] tracking-wider text-t3">
          <span className="font-bold text-t1">{s.models.length}</span> MODELS REGISTERED · <span className="font-bold text-safe">1</span> SERVING INFERENCE
        </p>
        <Button variant="primary" onClick={() => setUpload(true)}><Upload size={15} /> UPLOAD MODEL</Button>
      </div>

      {/* active model banner */}
      {active && (
        <Card className="relative overflow-hidden">
          <div className="absolute inset-y-0 left-0 w-[3px] bg-pri" />
          <div className="pointer-events-none absolute right-[-80px] top-[-80px] h-[240px] w-[240px] rounded-full bg-[radial-gradient(closest-side,rgba(34,211,238,0.09),transparent)]" />
          <div className="flex flex-wrap items-center gap-6 p-6">
            <span className="flex h-14 w-14 items-center justify-center rounded-xl border border-pri/30 bg-pri/8 text-pri">
              <Layers size={24} />
            </span>
            <div className="min-w-[220px] flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="font-mono text-[19px] font-bold tracking-wide text-t1">{active.name.toUpperCase()} {active.version.toUpperCase()}</h2>
                <StatusPillModel st="ACTIVE" />
              </div>
              <p className="mt-1 text-[12.5px] text-t3">Serving all online cameras · {s.settings.device} · {s.settings.precision} · auto-recovery armed</p>
            </div>
            <div className="grid grid-cols-3 gap-6">
              {([
                ["ACCURACY", `${active.accuracy.toFixed(1)}%`, "#22D3EE"],
                ["INFERENCE", `${s.metrics.fps.toFixed(1)} FPS`, "#38BDF8"],
                ["LATENCY", `${s.metrics.latency}ms`, "#20E3A2"],
              ] as [string, string, string][]).map(([k, v, c]) => (
                <div key={k} className="text-center">
                  <p className="font-mono text-[9px] tracking-[0.16em] text-t3">{k}</p>
                  <p className="mt-1 font-mono text-[19px] font-bold tabular-nums" style={{ color: c }}>{v}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {s.models.map((m) => <ModelCard key={m.id} m={m} />)}
      </div>

      <Card className="flex flex-wrap items-center gap-4 border-dashed p-5">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-ink text-t3"><Cpu size={17} /></span>
        <div className="flex-1">
          <p className="text-[13px] font-semibold text-t1">Model directory: <span className="font-mono text-pri">/opt/safehaven/models</span></p>
          <p className="mt-0.5 text-[11.5px] text-t3">Weights are validated, checksummed and hot-swapped without stream interruption.</p>
        </div>
        <span className={cx("font-mono text-[10px] tracking-wider text-t3")}>STORAGE 4.1 / 32 GB</span>
      </Card>

      <UploadModal open={upload} onClose={() => setUpload(false)} />
      <span className="hidden"><Target size={1} /></span>
    </div>
  );
}
