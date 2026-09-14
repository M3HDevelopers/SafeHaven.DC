import React, { useRef, useState } from "react";
import { Upload, Film, Image as ImageIcon, Play, Trash2, Eye, Video, X, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useStore } from "../lib/store";
import { Card, CardHead, Button, ConfirmModal, cx, Modal, ModalHead } from "../lib/ui";
import { fmtBytes, timeAgo, type CameraSource, type Detection } from "../lib/data";

interface MediaFile {
  id: string;
  source: CameraSource;
  detections: Detection[];
  status: "uploaded" | "detecting" | "completed";
  thumbnail?: string;
}

export default function Media() {
  const s = useStore();
  const videoIn = useRef<HTMLInputElement>(null);
  const imageIn = useRef<HTMLInputElement>(null);
  const [delId, setDelId] = useState<string | null>(null);
  const [viewResult, setViewResult] = useState<MediaFile | null>(null);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);

  const handleUpload = async (file: File, kind: "video" | "image") => {
    const source = kind === "video" ? await s.addVideoSource(file) : await s.addImageSource(file);
    const newFile: MediaFile = {
      id: source.id,
      source,
      detections: [],
      status: "uploaded",
    };
    setMediaFiles((prev) => [newFile, ...prev]);
    s.toast("success", "File uploaded", `${file.name} ready for detection.`);
  };

  const startDetection = async (file: MediaFile) => {
    setMediaFiles((prev) => prev.map((f) => f.id === file.id ? { ...f, status: "detecting" as const } : f));
    s.setActiveSourceId(file.id);
    s.navigate("live");
    
    // Detection will happen in live view, after 3 seconds mark as completed
    setTimeout(() => {
      setMediaFiles((prev) => prev.map((f) => f.id === file.id ? { ...f, status: "completed" as const } : f));
    }, 3000);
  };

  const videos = mediaFiles.filter((f) => f.source.kind === "video");
  const images = mediaFiles.filter((f) => f.source.kind === "image");

  return (
    <div className="space-y-5">
      {/* Upload Section */}
      <Card>
        <CardHead title="UPLOAD MEDIA FOR DETECTION" sub="Upload videos or images to analyze with AI" />
        <div className="p-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Video Upload */}
            <div>
              <input ref={videoIn} type="file" accept="video/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleUpload(f, "video"); e.target.value = ""; }} />
              <button onClick={() => videoIn.current?.click()} className="flex w-full flex-col items-center gap-3 rounded-xl border-2 border-dashed border-line bg-ink px-6 py-8 transition-colors duration-150 hover:border-blu/50 hover:bg-blu/4">
                <Film size={32} className="text-blu" />
                <span className="text-[14px] font-semibold text-t1">Upload Video</span>
                <span className="font-mono text-[10.5px] text-t3">MP4, WebM, MOV — Frame-by-frame analysis</span>
              </button>
            </div>

            {/* Image Upload */}
            <div>
              <input ref={imageIn} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleUpload(f, "image"); e.target.value = ""; }} />
              <button onClick={() => imageIn.current?.click()} className="flex w-full flex-col items-center gap-3 rounded-xl border-2 border-dashed border-line bg-ink px-6 py-8 transition-colors duration-150 hover:border-warn/50 hover:bg-warn/4">
                <ImageIcon size={32} className="text-warn" />
                <span className="text-[14px] font-semibold text-t1">Upload Image</span>
                <span className="font-mono text-[10.5px] text-t3">JPG, PNG — Single-frame detection</span>
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Videos Section */}
      {videos.length > 0 && (
        <Card>
          <CardHead title="VIDEOS" sub={`${videos.length} video${videos.length > 1 ? "s" : ""} uploaded`} icon={<Film size={15} />} />
          <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
            {videos.map((f) => <MediaCard key={f.id} file={f} onDelete={() => setDelId(f.id)} onDetect={() => startDetection(f)} onView={() => setViewResult(f)} />)}
          </div>
        </Card>
      )}

      {/* Images Section */}
      {images.length > 0 && (
        <Card>
          <CardHead title="IMAGES" sub={`${images.length} image${images.length > 1 ? "s" : ""} uploaded`} icon={<ImageIcon size={15} />} />
          <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
            {images.map((f) => <MediaCard key={f.id} file={f} onDelete={() => setDelId(f.id)} onDetect={() => startDetection(f)} onView={() => setViewResult(f)} />)}
          </div>
        </Card>
      )}

      {/* Empty State */}
      {mediaFiles.length === 0 && (
        <Card>
          <div className="flex flex-col items-center py-16 text-center">
            <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-line bg-raise text-t3"><Upload size={22} /></span>
            <p className="text-[14.5px] font-semibold text-t1">No media uploaded yet.</p>
            <p className="mt-1.5 max-w-[420px] text-[12.5px] leading-relaxed text-t3">
              Upload videos or images above to start AI-powered threat detection. Each file will be analyzed and results will show detected threats with bounding boxes.
            </p>
          </div>
        </Card>
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        open={!!delId}
        title="Delete media file?"
        body="This will remove the file from browser storage. Any incidents detected from this file will remain in the threat logs."
        onCancel={() => setDelId(null)}
        onConfirm={() => { if (delId) { s.deleteSource(delId); setMediaFiles((prev) => prev.filter((f) => f.id !== delId)); } setDelId(null); }}
      />

      {/* Result Modal */}
      {viewResult && <ResultModal file={viewResult} onClose={() => setViewResult(null)} />}
    </div>
  );
}

function MediaCard({ file, onDelete, onDetect, onView }: { file: MediaFile; onDelete: () => void; onDetect: () => void; onView: () => void }) {
  const isVideo = file.source.kind === "video";
  const hasDetections = file.source.threats > 0;
  
  return (
    <Card hover className="flex flex-col p-4">
      <div className="flex items-start justify-between gap-3">
        <span className={cx("flex h-11 w-11 items-center justify-center rounded-xl border", isVideo ? "border-blu/40 bg-blu/8 text-blu" : "border-warn/40 bg-warn/8 text-warn")}>
          {isVideo ? <Film size={16} /> : <ImageIcon size={16} />}
        </span>
        <span className="rounded-md border border-line bg-ink px-2 py-1 font-mono text-[9.5px] text-t2">{file.source.kind.toUpperCase()}</span>
      </div>
      
      <div className="mt-3.5 min-w-0">
        <p className="truncate text-[14px] font-bold text-t1" title={file.source.fileName}>{file.source.name}</p>
        <p className="font-mono text-[10.5px] tracking-wider text-pri">{file.source.id}</p>
      </div>

      {/* Detection Status */}
      <div className="mt-3 rounded-lg border border-line bg-ink p-3">
        {file.status === "uploaded" && (
          <div className="flex items-center gap-2 text-[11px] text-t3">
            <Upload size={12} />
            <span>Ready for detection</span>
          </div>
        )}
        {file.status === "detecting" && (
          <div className="flex items-center gap-2 text-[11px] text-pri">
            <div className="h-2 w-2 animate-pulse rounded-full bg-pri" />
            <span>Analyzing...</span>
          </div>
        )}
        {file.status === "completed" && (
          <div className="flex items-center gap-2 text-[11px]">
            {hasDetections ? (
              <>
                <AlertTriangle size={12} className="text-threat" />
                <span className="text-threat font-semibold">{file.source.threats} threat{file.source.threats > 1 ? "s" : ""} detected</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={12} className="text-safe" />
                <span className="text-safe">No threats found</span>
              </>
            )}
          </div>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-line pt-3 font-mono text-[10.5px]">
        <span className="text-t3">DETECTIONS <span className="ml-1 text-t2">{file.source.detections}</span></span>
        <span className="text-t3">THREATS <span className={cx("ml-1", file.source.threats > 0 ? "text-warn" : "text-t2")}>{file.source.threats}</span></span>
        <span className="col-span-2 text-t3">UPLOADED <span className="ml-1 text-t2">{timeAgo(file.source.createdAt, Date.now())}</span></span>
      </div>

      <div className="mt-4 flex gap-2">
        {file.status === "uploaded" ? (
          <Button variant="primary" size="sm" className="flex-1" onClick={onDetect}>
            <Play size={13} /> START DETECTION
          </Button>
        ) : file.status === "detecting" ? (
          <Button variant="secondary" size="sm" className="flex-1" disabled>
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-pri border-t-transparent" />
            DETECTING...
          </Button>
        ) : (
          <Button variant="secondary" size="sm" className="flex-1" onClick={onView}>
            <Eye size={13} /> VIEW RESULTS
          </Button>
        )}
        <Button variant="ghost" size="sm" className="text-threat hover:bg-threat/10" onClick={onDelete} aria-label={`Delete ${file.source.id}`}>
          <Trash2 size={13} />
        </Button>
      </div>
    </Card>
  );
}

function ResultModal({ file, onClose }: { file: MediaFile; onClose: () => void }) {
  const s = useStore();
  const incidents = s.incidents.filter((i) => i.sourceId === file.source.id);
  
  return (
    <Modal open onClose={onClose} width="max-w-4xl">
      <ModalHead title={`Detection Results: ${file.source.name}`} sub={`${incidents.length} incident${incidents.length !== 1 ? "s" : ""} detected`} onClose={onClose} />
      <div className="space-y-4 p-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg border border-line bg-ink p-4 text-center">
            <p className="font-mono text-[10px] font-semibold tracking-wider text-t3">TOTAL DETECTIONS</p>
            <p className="mt-1 font-mono text-[24px] font-bold text-pri">{file.source.detections}</p>
          </div>
          <div className="rounded-lg border border-line bg-ink p-4 text-center">
            <p className="font-mono text-[10px] font-semibold tracking-wider text-t3">THREATS</p>
            <p className="mt-1 font-mono text-[24px] font-bold text-threat">{file.source.threats}</p>
          </div>
          <div className="rounded-lg border border-line bg-ink p-4 text-center">
            <p className="font-mono text-[10px] font-semibold tracking-wider text-t3">STATUS</p>
            <p className={cx("mt-1 font-mono text-[14px] font-bold", file.source.threats > 0 ? "text-threat" : "text-safe")}>
              {file.source.threats > 0 ? "THREATS FOUND" : "SAFE"}
            </p>
          </div>
        </div>

        {/* Incidents List */}
        {incidents.length > 0 ? (
          <div className="space-y-3">
            <p className="text-[12px] font-semibold text-t1">Detected Incidents:</p>
            {incidents.map((inc) => (
              <div key={inc.id} className="flex items-center gap-3 rounded-lg border border-line bg-ink p-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ background: inc.severity === "CRITICAL" ? "rgba(255,23,68,0.12)" : "rgba(255,159,28,0.12)" }}>
                  <AlertTriangle size={16} style={{ color: inc.severity === "CRITICAL" ? "#FF1744" : "#FF9F1C" }} />
                </span>
                <div className="flex-1">
                  <p className="text-[13px] font-semibold text-t1">{inc.label}</p>
                  <p className="font-mono text-[10px] text-t3">Confidence: {inc.confidence.toFixed(1)}% · {inc.severity}</p>
                </div>
                <Button variant="secondary" size="sm" onClick={() => { s.setOpenIncidentId(inc.id); onClose(); }}>
                  <Eye size={12} /> VIEW
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center py-8 text-center">
            <CheckCircle2 size={48} className="text-safe" />
            <p className="mt-3 text-[14px] font-semibold text-t1">No threats detected</p>
            <p className="mt-1 text-[12px] text-t3">The AI model did not find any threats in this file.</p>
          </div>
        )}
      </div>
      <div className="flex justify-end border-t border-line px-6 py-4">
        <Button variant="primary" onClick={onClose}>CLOSE</Button>
      </div>
    </Modal>
  );
}
