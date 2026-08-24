import React, { useEffect, useRef, useState } from "react";
import { Plus, Eye, Trash2, RefreshCw, Loader2, Smartphone, Film, Image as ImageIcon, Server, Upload, Video, X } from "lucide-react";
import { useStore } from "../lib/store";
import { Card, Button, Input, Field, Select, Modal, ModalHead, ConfirmModal, StatusPill, cx } from "../lib/ui";
import { timeAgo, fmtBytes, type CameraSource } from "../lib/data";

const KIND_META: Record<CameraSource["kind"], { label: string; icon: React.ReactNode }> = {
  webcam: { label: "Webcam / Mobile", icon: <Smartphone size={14} /> },
  video: { label: "Video file", icon: <Film size={14} /> },
  image: { label: "Image file", icon: <ImageIcon size={14} /> },
  rtsp: { label: "RTSP stream", icon: <Server size={14} /> },
};

/* ---------------- ADD SOURCE MODAL ---------------- */

function AddSourceModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const s = useStore();
  const [kind, setKind] = useState<CameraSource["kind"]>("webcam");
  const [name, setName] = useState("");
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [deviceId, setDeviceId] = useState("");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [permBusy, setPermBusy] = useState(false);
  const [permErr, setPermErr] = useState("");
  const [rtspUrl, setRtspUrl] = useState("");
  const [testing, setTesting] = useState<"idle" | "busy" | "ok" | "fail">("idle");
  const [saving, setSaving] = useState(false);
  const videoIn = useRef<HTMLInputElement>(null);
  const imageIn = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && kind === "webcam") {
      setPermErr("");
      setPermBusy(true);
      navigator.mediaDevices
        ?.getUserMedia({ video: true })
        .then((st) => {
          st.getTracks().forEach((t) => t.stop());
          return navigator.mediaDevices.enumerateDevices();
        })
        .then((list) => setDevices(list.filter((d) => d.kind === "videoinput")))
        .catch((e) => setPermErr(e instanceof Error ? e.message : "Camera permission denied"))
        .finally(() => setPermBusy(false));
    }
  }, [open, kind]);

  const save = async () => {
    setSaving(true);
    try {
      if (kind === "webcam") await s.addWebcamSource({ name, deviceId: deviceId || undefined, facing });
      else if (kind === "rtsp") await s.addRtspSource({ name, endpoint: rtspUrl });
      onClose();
    } catch (e) {
      setPermErr(e instanceof Error ? e.message : "Could not access the camera.");
    } finally {
      setSaving(false);
    }
  };

  const testRtsp = async () => {
    setTesting("busy");
    const ok = await s.testConnection(rtspUrl);
    setTesting(ok ? "ok" : "fail");
  };

  return (
    <Modal open={open} onClose={onClose} width="max-w-xl">
      <ModalHead title="ADD SOURCE" sub="Camera, mobile cam, video file, image or RTSP" onClose={onClose} />
      <div className="space-y-5 p-6">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {(Object.keys(KIND_META) as CameraSource["kind"][]).map((k) => (
            <button
              key={k}
              onClick={() => { setKind(k); setTesting("idle"); }}
              className={cx(
                "flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3.5 text-[11px] font-semibold transition-all duration-150",
                kind === k ? "border-pri/60 bg-pri/8 text-pri" : "border-line bg-ink text-t2 hover:border-edge hover:text-t1"
              )}
            >
              {KIND_META[k].icon}
              {KIND_META[k].label}
            </button>
          ))}
        </div>

        <Field label="Source Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. My Phone Camera" />
        </Field>

        {kind === "webcam" && (
          <div className="space-y-4">
            {permBusy ? (
              <p className="flex items-center gap-2 font-mono text-[11px] text-pri"><Loader2 size={13} className="animate-spin" /> Requesting camera permission…</p>
            ) : permErr ? (
              <p className="rounded-lg border border-threat/40 bg-threat/10 px-3.5 py-2.5 text-[12px] text-threat">{permErr}</p>
            ) : (
              <Field label="Camera Device" hint="On mobile, 'environment' uses the back camera.">
                <Select
                  value={deviceId || facing}
                  onChange={(v) => { if (v === "environment" || v === "user") { setFacing(v); setDeviceId(""); } else setDeviceId(v); }}
                  options={[
                    { value: "environment", label: "Mobile back camera (environment)" },
                    { value: "user", label: "Front camera (user)" },
                    ...devices.map((d) => ({ value: d.deviceId, label: d.label || `Camera ${d.deviceId.slice(0, 6)}` })),
                  ]}
                />
              </Field>
            )}
            <p className="rounded-lg border border-line bg-ink px-3.5 py-2.5 font-mono text-[10px] leading-relaxed text-t3">
              WORKS ON MOBILE: open SafeHaven on your phone, allow camera access, and the back camera becomes a live AI-monitored source.
            </p>
          </div>
        )}

        {kind === "video" && (
          <FilePick refEl={videoIn} accept="video/*" label="Upload Video File" hint="MP4 / WebM / MOV — stored in browser storage, analyzed frame by frame." onPick={async (f) => { setSaving(true); try { await s.addVideoSource(f); onClose(); } finally { setSaving(false); } }} busy={saving} />
        )}
        {kind === "image" && (
          <FilePick refEl={imageIn} accept="image/*" label="Upload Image File" hint="JPG / PNG — single-frame AI analysis with detection boxes." onPick={async (f) => { setSaving(true); try { await s.addImageSource(f); onClose(); } finally { setSaving(false); } }} busy={saving} />
        )}

        {kind === "rtsp" && (
          <div className="space-y-4">
            <Field label="RTSP URL">
              <Input value={rtspUrl} onChange={(e) => { setRtspUrl(e.target.value); setTesting("idle"); }} placeholder="rtsp://192.168.1.50:554/stream1" className="font-mono text-[12.5px]" />
            </Field>
            <div className="flex items-center gap-3 rounded-lg border border-line bg-ink px-4 py-3">
              <Button variant="outline" size="sm" onClick={testRtsp} disabled={testing === "busy" || !rtspUrl.trim()}>
                {testing === "busy" ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                {testing === "busy" ? "TESTING…" : "TEST CONNECTION"}
              </Button>
              {testing === "ok" && <span className="flex items-center gap-2 font-mono text-[11px] font-semibold text-safe"><span className="h-2 w-2 rounded-full bg-safe" /> Connection successful</span>}
              {testing === "fail" && <span className="flex items-center gap-2 font-mono text-[11px] font-semibold text-threat"><span className="h-2 w-2 rounded-full bg-threat" /> Unable to connect</span>}
              {testing === "idle" && <span className="font-mono text-[10.5px] text-t3">Proxied by the backend via ffmpeg.</span>}
            </div>
          </div>
        )}
      </div>

      {(kind === "webcam" || kind === "rtsp") && (
        <div className="flex justify-end gap-2.5 border-t border-line px-6 py-4">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={saving || (kind === "rtsp" && !rtspUrl.trim())} onClick={save}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Save Source
          </Button>
        </div>
      )}
    </Modal>
  );
}

function FilePick({ refEl, accept, label, hint, onPick, busy }: { refEl: React.RefObject<HTMLInputElement>; accept: string; label: string; hint: string; onPick: (f: File) => void; busy: boolean }) {
  const [file, setFile] = useState<File | null>(null);
  return (
    <div>
      <input ref={refEl} type="file" accept={accept} className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      <button
        onClick={() => refEl.current?.click()}
        className="flex w-full flex-col items-center justify-center gap-2.5 rounded-xl border-2 border-dashed border-line bg-ink px-6 py-8 transition-colors duration-150 hover:border-pri/50 hover:bg-pri/4"
      >
        <Upload size={20} className="text-pri" />
        <span className="text-[13px] font-semibold text-t1">{file ? file.name : label}</span>
        <span className="font-mono text-[10.5px] text-t3">{file ? `${fmtBytes(file.size)} — ready to analyze` : hint}</span>
      </button>
      {file && (
        <div className="mt-3 flex items-center justify-between gap-3">
          <Button variant="ghost" size="sm" onClick={() => setFile(null)}><X size={13} /> Choose another</Button>
          <Button variant="primary" size="sm" disabled={busy} onClick={() => onPick(file)}>
            {busy ? <Loader2 size={13} className="animate-spin" /> : <Film size={13} />} {accept.startsWith("video") ? "Upload & Analyze Video" : "Upload & Analyze Image"}
          </Button>
        </div>
      )}
    </div>
  );
}

/* ---------------- source card ---------------- */

function SourceCard({ src }: { src: CameraSource }) {
  const s = useStore();
  const [confirmDel, setConfirmDel] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const online = src.status === "online";
  const meta = KIND_META[src.kind];

  return (
    <Card hover className="flex flex-col p-4">
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-ink text-pri">{meta.icon}</span>
        <div className="flex items-center gap-2">
          <StatusPill ok={online} label={online ? "ONLINE" : "OFFLINE"} />
          <span className="rounded-md border border-line bg-ink px-2 py-1 font-mono text-[9.5px] text-t2">{meta.label}</span>
        </div>
      </div>
      <div className="mt-3.5 min-w-0">
        <p className="truncate text-[14px] font-bold text-t1">{src.name}</p>
        <p className="font-mono text-[10.5px] tracking-wider text-pri">{src.id} · {src.location.toUpperCase()}</p>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-line pt-3 font-mono text-[10.5px]">
        <span className="text-t3">FPS <span className="ml-1 text-t2">{s.running && s.activeSourceId === src.id ? src.fps.toFixed(1) : "—"}</span></span>
        <span className="text-t3">HEARTBEAT <span className="ml-1 text-t2">{timeAgo(src.createdAt + src.lastHeartbeat * 1000, s.now).replace(" ago", "")}s</span></span>
        <span className="text-t3">DETECTIONS <span className="ml-1 text-t2">{src.detections}</span></span>
        <span className="text-t3">THREATS <span className={cx("ml-1", src.threats > 0 ? "text-warn" : "text-t2")}>{src.threats}</span></span>
        <span className="col-span-2 truncate text-t3">SRC <span className="ml-1 text-t2">{src.endpoint}</span></span>
      </div>
      <div className="mt-4 flex gap-2">
        <Button variant="secondary" size="sm" className="flex-1" onClick={() => { s.setActiveSourceId(src.id); s.navigate("live"); }}>
          <Eye size={13} /> VIEW
        </Button>
        {!online && (
          <Button variant="ghost" size="sm" onClick={() => { setRetrying(true); void s.retrySource(src.id).finally(() => setRetrying(false)); }} aria-label={`Reconnect ${src.id}`}>
            <RefreshCw size={13} className={retrying ? "animate-spin" : ""} />
          </Button>
        )}
        <Button variant="ghost" size="sm" className="text-threat hover:bg-threat/10" onClick={() => setConfirmDel(true)} aria-label={`Delete ${src.id}`}>
          <Trash2 size={13} />
        </Button>
      </div>
      <ConfirmModal
        open={confirmDel}
        title={`Delete ${src.name}?`}
        body={`Are you sure you want to delete ${src.name} (${src.id})? Live coverage for this source will stop immediately. Logged incidents stay archived.`}
        onCancel={() => setConfirmDel(false)}
        onConfirm={() => { setConfirmDel(false); s.deleteSource(src.id); }}
      />
    </Card>
  );
}

/* ---------------- page ---------------- */

export default function Cameras() {
  const s = useStore();
  const [add, setAdd] = useState(false);
  const videoIn = useRef<HTMLInputElement>(null);
  const imageIn = useRef<HTMLInputElement>(null);
  const online = s.sources.filter((c) => c.status === "online").length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-5 font-mono text-[11px] tracking-wider text-t3">
          <span><span className="font-bold text-t1">{s.sources.length}</span> SOURCES</span>
          <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-safe" /><span className="font-bold text-safe">{online}</span> ONLINE</span>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <input ref={videoIn} type="file" accept="video/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void s.addVideoSource(f); e.target.value = ""; }} />
          <input ref={imageIn} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void s.addImageSource(f); e.target.value = ""; }} />
          <Button variant="secondary" onClick={() => videoIn.current?.click()}><Film size={14} /> UPLOAD VIDEO</Button>
          <Button variant="secondary" onClick={() => imageIn.current?.click()}><ImageIcon size={14} /> UPLOAD IMAGE</Button>
          <Button variant="primary" onClick={() => setAdd(true)}><Plus size={15} /> ADD CAMERA</Button>
        </div>
      </div>

      {s.sources.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center py-16 text-center">
            <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-line bg-raise text-t3"><Video size={22} /></span>
            <p className="text-[14.5px] font-semibold text-t1">No cameras connected.</p>
            <p className="mt-1.5 max-w-[420px] text-[12.5px] leading-relaxed text-t3">
              Connect your mobile camera for live testing, upload a video or image for file-based detection, or add an RTSP camera via the backend.
            </p>
            <div className="mt-5 flex gap-2.5">
              <Button variant="primary" onClick={() => setAdd(true)}><Plus size={14} /> ADD CAMERA</Button>
              <Button variant="outline" onClick={() => videoIn.current?.click()}><Film size={14} /> UPLOAD VIDEO</Button>
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {s.sources.map((c) => <SourceCard key={c.id} src={c} />)}
        </div>
      )}

      <AddSourceModal open={add} onClose={() => setAdd(false)} />
    </div>
  );
}
