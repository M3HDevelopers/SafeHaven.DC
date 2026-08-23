import React, { useState } from "react";
import { Plus, Eye, Pencil, Trash2, RefreshCw, Loader2, WifiOff, Video } from "lucide-react";
import { useStore } from "../lib/store";
import { Card, Button, Input, Field, Select, Modal, ModalHead, ConfirmModal, StatusPill, cx } from "../lib/ui";
import { timeAgo, type Camera } from "../lib/data";

function AddCameraModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const s = useStore();
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [source, setSource] = useState("Webcam");
  const [url, setUrl] = useState("");
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [test, setTest] = useState<"idle" | "testing" | "ok" | "fail">("idle");

  const needsUrl = source !== "Webcam";
  const valid = name.trim().length > 1 && (!needsUrl || url.trim().length > 3);

  const runTest = async () => {
    setTest("testing");
    const ok = await s.testConnection(source, needsUrl ? url : "webcam");
    setTest(ok ? "ok" : "fail");
  };

  const save = () => {
    s.addCamera({ name, location, source: source as Camera["source"], endpoint: needsUrl ? url : "/dev/video" });
    onClose();
    setName(""); setLocation(""); setUrl(""); setUser(""); setPass(""); setTest("idle");
  };

  return (
    <Modal open={open} onClose={onClose} width="max-w-xl">
      <ModalHead title="ADD CAMERA" sub="Register a new surveillance source" onClose={onClose} />
      <div className="space-y-4 p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Camera Name">
            <Input placeholder="e.g. Camera 11" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Location">
            <Input placeholder="e.g. South Gate" value={location} onChange={(e) => setLocation(e.target.value)} />
          </Field>
        </div>
        <Field label="Source Type">
          <Select value={source} onChange={(v) => { setSource(v); setTest("idle"); }}
            options={["Webcam", "IP Camera", "RTSP Stream", "Video File"].map((o) => ({ value: o, label: o }))} />
        </Field>
        {needsUrl && (
          <>
            <Field label={source === "Video File" ? "File Path / URL" : "RTSP URL"}>
              <Input placeholder="rtsp://10.0.4.50:554/stream1" value={url} onChange={(e) => { setUrl(e.target.value); setTest("idle"); }} className="font-mono text-[12.5px]" />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Username">
                <Input placeholder="admin" value={user} onChange={(e) => setUser(e.target.value)} autoComplete="off" />
              </Field>
              <Field label="Password">
                <Input type="password" placeholder="••••••••" value={pass} onChange={(e) => setPass(e.target.value)} autoComplete="new-password" />
              </Field>
            </div>
          </>
        )}

        <div className="flex items-center gap-3 rounded-lg border border-line bg-ink px-4 py-3">
          <Button variant="outline" size="sm" onClick={runTest} disabled={test === "testing" || (needsUrl && !url.trim())}>
            {test === "testing" ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            {test === "testing" ? "TESTING…" : "TEST CONNECTION"}
          </Button>
          {test === "ok" && (
            <span className="flex items-center gap-2 font-mono text-[11.5px] font-semibold text-safe">
              <span className="h-2 w-2 rounded-full bg-safe" /> Connection successful · handshake 42ms
            </span>
          )}
          {test === "fail" && (
            <span className="flex items-center gap-2 font-mono text-[11.5px] font-semibold text-threat">
              <span className="h-2 w-2 rounded-full bg-threat" /> Unable to connect — check URL and credentials
            </span>
          )}
          {test === "idle" && <span className="font-mono text-[10.5px] text-t3">Verify the uplink before saving.</span>}
        </div>
      </div>
      <div className="flex justify-end gap-2.5 border-t border-line px-6 py-4">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" disabled={!valid} onClick={save}><Plus size={14} /> Save Camera</Button>
      </div>
    </Modal>
  );
}

function EditCameraModal({ cam, onClose }: { cam: Camera; onClose: () => void }) {
  const s = useStore();
  const [name, setName] = useState(cam.location);
  const [endpoint, setEndpoint] = useState(cam.endpoint);
  return (
    <Modal open onClose={onClose} width="max-w-md">
      <ModalHead title={`EDIT ${cam.id}`} sub={cam.name} onClose={onClose} />
      <div className="space-y-4 p-6">
        <Field label="Location Label">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Stream Endpoint">
          <Input value={endpoint} onChange={(e) => setEndpoint(e.target.value)} className="font-mono text-[12.5px]" />
        </Field>
        <Field label="Resolution">
          <Select value={cam.resolution} onChange={() => undefined}
            options={["1280×720", "1920×1080", "2560×1440"].map((o) => ({ value: o, label: o }))} />
        </Field>
      </div>
      <div className="flex justify-end gap-2.5 border-t border-line px-6 py-4">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={() => { s.updateCamera(cam.id, { location: name, endpoint }); s.toast("success", "Camera updated", `${cam.id} configuration saved.`); onClose(); }}>
          Save Changes
        </Button>
      </div>
    </Modal>
  );
}

function CameraCard({ cam }: { cam: Camera }) {
  const s = useStore();
  const [confirmDel, setConfirmDel] = useState(false);
  const [edit, setEdit] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const online = cam.status === "online";

  return (
    <Card hover className="overflow-hidden">
      <div className="relative">
        <img src={cam.img} alt={`${cam.id} feed`} className={cx("aspect-video w-full object-cover", !online && "opacity-40 grayscale")} style={{ filter: "saturate(0.72)" }} />
        <span className="absolute left-3 top-3"><StatusPill ok={online} label={online ? "ONLINE" : "OFFLINE"} /></span>
        <span className="absolute right-3 top-3 rounded bg-black/55 px-2 py-1 font-mono text-[9.5px] font-semibold text-pri backdrop-blur-sm">
          {online ? `${cam.fps.toFixed(1)} FPS` : "NO SIGNAL"}
        </span>
        {!online && (
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 border-t border-threat/30 bg-[rgba(255,23,68,0.12)] px-3.5 py-2 backdrop-blur-sm">
            <span className="flex items-center gap-2 font-mono text-[10px] font-semibold text-threat">
              <WifiOff size={12} /> CONNECTION LOST · {timeAgo(s.now - cam.lastHeartbeat * 1000, s.now).toUpperCase()}
            </span>
            <Button variant="ghost" size="sm" className="h-7 text-[11px] text-t1" onClick={() => { setRetrying(true); s.retryCamera(cam.id); setTimeout(() => setRetrying(false), 1800); }}>
              <RefreshCw size={11} className={retrying ? "animate-spin" : ""} /> RETRY
            </Button>
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[14px] font-bold text-t1">{cam.location}</p>
            <p className="font-mono text-[10.5px] tracking-wider text-pri">{cam.id} · {cam.name.toUpperCase()}</p>
          </div>
          <span className="rounded-md border border-line bg-ink px-2 py-1 font-mono text-[9.5px] text-t2">{cam.source}</span>
        </div>
        <div className="mt-3.5 grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-line pt-3 font-mono text-[10.5px]">
          <span className="text-t3">RES <span className="ml-1 text-t2">{cam.resolution}</span></span>
          <span className="text-t3">HEARTBEAT <span className="ml-1 text-t2">{online ? `${cam.lastHeartbeat}s ago` : "—"}</span></span>
          <span className="text-t3">THREATS <span className={cx("ml-1", cam.threats > 0 ? "text-warn" : "text-t2")}>{cam.threats}</span></span>
          <span className="truncate text-t3">SRC <span className="ml-1 text-t2">{cam.endpoint}</span></span>
        </div>
        <div className="mt-4 flex gap-2">
          <Button variant="secondary" size="sm" className="flex-1" onClick={() => { s.setActiveCamId(cam.id); s.navigate("live", { cam: cam.id }); }}>
            <Eye size={13} /> VIEW
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setEdit(true)} aria-label={`Edit ${cam.id}`}><Pencil size={13} /> EDIT</Button>
          <Button variant="ghost" size="sm" className="text-threat hover:bg-threat/10" onClick={() => setConfirmDel(true)} aria-label={`Delete ${cam.id}`}>
            <Trash2 size={13} />
          </Button>
        </div>
      </div>
      {edit && <EditCameraModal cam={cam} onClose={() => setEdit(false)} />}
      <ConfirmModal
        open={confirmDel}
        title={`Delete ${cam.location}?`}
        body={`Are you sure you want to delete ${cam.name} (${cam.id})? Live coverage for this zone will stop immediately and recorded history stays archived.`}
        onCancel={() => setConfirmDel(false)}
        onConfirm={() => { setConfirmDel(false); s.deleteCamera(cam.id); }}
      />
    </Card>
  );
}

export default function Cameras() {
  const s = useStore();
  const [add, setAdd] = useState(false);
  const online = s.cameras.filter((c) => c.status === "online").length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-5 font-mono text-[11px] tracking-wider text-t3">
          <span><span className="font-bold text-t1">{s.cameras.length}</span> SOURCES</span>
          <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-safe" /><span className="font-bold text-safe">{online}</span> ONLINE</span>
          <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-threat" /><span className="font-bold text-threat">{s.cameras.length - online}</span> OFFLINE</span>
        </div>
        <Button variant="primary" onClick={() => setAdd(true)}><Plus size={15} /> ADD CAMERA</Button>
      </div>

      {s.cameras.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center py-16 text-center">
            <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-line bg-raise text-t3"><Video size={22} /></span>
            <p className="text-[14.5px] font-semibold text-t1">No cameras connected.</p>
            <p className="mt-1.5 text-[12.5px] text-t3">Add your first surveillance source to begin AI monitoring.</p>
            <Button variant="primary" className="mt-5" onClick={() => setAdd(true)}><Plus size={14} /> ADD CAMERA</Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {s.cameras.map((c) => <CameraCard key={c.id} cam={c} />)}
        </div>
      )}

      <AddCameraModal open={add} onClose={() => setAdd(false)} />
    </div>
  );
}
