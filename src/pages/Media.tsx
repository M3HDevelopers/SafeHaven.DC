import React, { useRef, useState } from "react";
import { Upload, Film, Image as ImageIcon, Play, Trash2, Eye, Video, X } from "lucide-react";
import { useStore } from "../lib/store";
import { Card, CardHead, Button, ConfirmModal, cx } from "../lib/ui";
import { fmtBytes, timeAgo, type CameraSource } from "../lib/data";

export default function Media() {
  const s = useStore();
  const videoIn = useRef<HTMLInputElement>(null);
  const imageIn = useRef<HTMLInputElement>(null);
  const [delId, setDelId] = useState<string | null>(null);

  const media = s.sources.filter((c) => c.kind === "video" || c.kind === "image");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-5 font-mono text-[11px] tracking-wider text-t3">
          <span><span className="font-bold text-t1">{media.length}</span> MEDIA FILES</span>
          <span className="flex items-center gap-2"><Film size={12} /><span className="font-bold text-t2">{media.filter((m) => m.kind === "video").length}</span> VIDEOS</span>
          <span className="flex items-center gap-2"><ImageIcon size={12} /><span className="font-bold text-t2">{media.filter((m) => m.kind === "image").length}</span> IMAGES</span>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <input ref={videoIn} type="file" accept="video/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void s.addVideoSource(f); e.target.value = ""; }} />
          <input ref={imageIn} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void s.addImageSource(f); e.target.value = ""; }} />
          <Button variant="secondary" onClick={() => videoIn.current?.click()}><Film size={14} /> UPLOAD VIDEO</Button>
          <Button variant="secondary" onClick={() => imageIn.current?.click()}><ImageIcon size={14} /> UPLOAD IMAGE</Button>
        </div>
      </div>

      {media.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center py-16 text-center">
            <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-line bg-raise text-t3"><Upload size={22} /></span>
            <p className="text-[14.5px] font-semibold text-t1">No media uploaded yet.</p>
            <p className="mt-1.5 max-w-[420px] text-[12.5px] leading-relaxed text-t3">
              Upload videos or images here for AI-powered threat detection. Each file will be analyzed frame-by-frame (video) or single-frame (image) using the active model.
            </p>
            <div className="mt-5 flex gap-2.5">
              <Button variant="primary" onClick={() => videoIn.current?.click()}><Film size={14} /> UPLOAD VIDEO</Button>
              <Button variant="outline" onClick={() => imageIn.current?.click()}><ImageIcon size={14} /> UPLOAD IMAGE</Button>
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {media.map((m) => <MediaCard key={m.id} m={m} onDelete={() => setDelId(m.id)} onView={() => { s.setActiveSourceId(m.id); s.navigate("live"); }} />)}
        </div>
      )}

      <ConfirmModal
        open={!!delId}
        title="Delete media file?"
        body="This will remove the file from browser storage. Any incidents detected from this file will remain in the threat logs."
        onCancel={() => setDelId(null)}
        onConfirm={() => { if (delId) s.deleteSource(delId); setDelId(null); }}
      />
    </div>
  );
}

function MediaCard({ m, onDelete, onView }: { m: CameraSource; onDelete: () => void; onView: () => void }) {
  const isVideo = m.kind === "video";
  return (
    <Card hover className="flex flex-col p-4">
      <div className="flex items-start justify-between gap-3">
        <span className={cx("flex h-11 w-11 items-center justify-center rounded-xl border", isVideo ? "border-blu/40 bg-blu/8 text-blu" : "border-warn/40 bg-warn/8 text-warn")}>
          {isVideo ? <Film size={16} /> : <ImageIcon size={16} />}
        </span>
        <span className="rounded-md border border-line bg-ink px-2 py-1 font-mono text-[9.5px] text-t2">{m.kind.toUpperCase()}</span>
      </div>
      <div className="mt-3.5 min-w-0">
        <p className="truncate text-[14px] font-bold text-t1" title={m.fileName}>{m.name}</p>
        <p className="font-mono text-[10.5px] tracking-wider text-pri">{m.id} · {m.fileName}</p>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-line pt-3 font-mono text-[10.5px]">
        <span className="text-t3">SIZE <span className="ml-1 text-t2">{m.endpoint ? "—" : "—"}</span></span>
        <span className="text-t3">UPLOADED <span className="ml-1 text-t2">{timeAgo(m.createdAt, Date.now())}</span></span>
        <span className="text-t3">DETECTIONS <span className="ml-1 text-t2">{m.detections}</span></span>
        <span className="text-t3">THREATS <span className={cx("ml-1", m.threats > 0 ? "text-warn" : "text-t2")}>{m.threats}</span></span>
      </div>
      <div className="mt-4 flex gap-2">
        <Button variant="secondary" size="sm" className="flex-1" onClick={onView}>
          <Eye size={13} /> {isVideo ? "PLAY & DETECT" : "ANALYZE"}
        </Button>
        <Button variant="ghost" size="sm" className="text-threat hover:bg-threat/10" onClick={onDelete} aria-label={`Delete ${m.id}`}>
          <Trash2 size={13} />
        </Button>
      </div>
    </Card>
  );
}
