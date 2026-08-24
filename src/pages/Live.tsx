import React from "react";
import { Radar, ShieldCheck, Maximize2, AlertTriangle, Smartphone, Film, Image as ImageIcon, Server } from "lucide-react";
import { useStore } from "../lib/store";
import { Card, CardHead, Button, Dot, SevBadge, cx, EmptyState } from "../lib/ui";
import { VideoViewport, ThreatLevelChip } from "../lib/layout";
import { DetectionControls } from "../lib/controls";
import { SEV, classColor, fmtTime, timeAgo, type CameraSource } from "../lib/data";

const KIND_ICON: Record<CameraSource["kind"], React.ReactNode> = {
  webcam: <Smartphone size={13} />,
  video: <Film size={13} />,
  image: <ImageIcon size={13} />,
  rtsp: <Server size={13} />,
};

function SourceList() {
  const s = useStore();
  return (
    <Card className="overflow-hidden">
      <CardHead title="SOURCES" sub={`${s.sources.filter((c) => c.status === "online").length} of ${s.sources.length} online`} icon={<Radar size={15} />} right={
        <Button variant="ghost" size="sm" onClick={() => s.navigate("cameras")}>+ ADD</Button>
      } />
      {s.sources.length === 0 ? (
        <div className="p-4">
          <EmptyState icon={<Radar size={20} />} title="No sources yet" sub="Add your mobile camera or upload media to start live AI detection." />
          <Button variant="primary" size="sm" className="mt-2 w-full" onClick={() => s.navigate("cameras")}>CONNECT A SOURCE</Button>
        </div>
      ) : (
        <div className="thin-scroll max-h-[560px] overflow-y-auto">
          {s.sources.map((c) => {
            const active = c.id === s.activeSourceId;
            return (
              <button
                key={c.id}
                onClick={() => s.setActiveSourceId(c.id)}
                className={cx(
                  "flex w-full items-center gap-3 border-l-[3px] px-4 py-3 text-left transition-all duration-150",
                  active ? "border-pri bg-pri/6" : "border-transparent hover:bg-white/3"
                )}
              >
                <span className={cx("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-ink", active ? "text-pri" : "text-t3")}>
                  {KIND_ICON[c.kind]}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cx("block truncate text-[12.5px] font-semibold", active ? "text-t1" : "text-t2")}>{c.name}</span>
                  <span className="block truncate text-[11px] text-t3">{c.location}</span>
                  <span className="mt-1 flex items-center gap-2.5 font-mono text-[9.5px] text-t3">
                    <span className={active && s.running ? "text-pri" : "text-t3"}>{c.kind.toUpperCase()}</span>
                    {c.threats > 0 && <span className="text-warn">{c.threats} threats</span>}
                    <span>{c.detections} det.</span>
                  </span>
                </span>
                <Dot color={c.status === "online" ? "#20E3A2" : "#FF3B4D"} pulse={c.status === "online"} />
              </button>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function LiveIncidents() {
  const s = useStore();
  const at = s.activeThreat;
  const fresh = s.incidents.filter((i) => i.status === "New").slice(0, 4);

  return (
    <Card className="overflow-hidden">
      <CardHead title="LIVE INCIDENTS" icon={<AlertTriangle size={15} />} right={
        at ? <SevBadge sev={at.inc.severity} pulse /> : <span className="font-mono text-[10px] font-semibold tracking-wider text-safe">CLEAR</span>
      } />
      <div className="p-4">
        {at ? (
          <div
            className={cx("anim-pop rounded-xl border p-4", at.inc.severity === "CRITICAL" && "anim-pulse-crit")}
            style={{ borderColor: `${SEV[at.inc.severity].color}55`, background: SEV[at.inc.severity].bg }}
          >
            <p className="font-mono text-[11px] font-bold tracking-[0.16em]" style={{ color: SEV[at.inc.severity].color }}>
              {at.inc.severity === "CRITICAL" ? "CRITICAL THREAT" : `${at.inc.severity} THREAT`}
            </p>
            <p className="mt-1.5 text-[13.5px] font-bold capitalize text-t1">{at.inc.label} detected</p>
            <div className="mt-3 space-y-1 font-mono text-[10.5px] text-t2">
              <p className="flex justify-between"><span className="text-t3">SOURCE</span>{at.inc.sourceName}</p>
              <p className="flex justify-between"><span className="text-t3">CONFIDENCE</span><span className="font-bold" style={{ color: SEV[at.inc.severity].color }}>{at.inc.confidence.toFixed(1)}%</span></p>
              <p className="flex justify-between"><span className="text-t3">DETECTED</span>{fmtTime(at.inc.time)}</p>
            </div>
            <div className="mt-4 flex gap-2">
              <Button variant="danger" size="sm" className="flex-1" onClick={() => s.setOpenIncidentId(at.inc.id)}>VIEW INCIDENT</Button>
              <Button variant="ghost" size="sm" onClick={() => { const aid = s.alerts.find((a) => a.incidentId === at.inc.id)?.id; if (aid !== undefined) s.dismissAlert(aid); }}>DISMISS</Button>
            </div>
          </div>
        ) : (
          <EmptyState
            icon={<ShieldCheck size={22} />}
            title="Everything is clear."
            sub="AI monitoring is active. Real threats will appear here the moment the model detects them."
          />
        )}

        {fresh.length > 0 && (
          <div className="mt-4 border-t border-line pt-3">
            <p className="mb-2 px-1 font-mono text-[9.5px] font-semibold tracking-[0.16em] text-t3">UNREVIEWED QUEUE</p>
            {fresh.map((i) => (
              <button
                key={i.id}
                onClick={() => s.setOpenIncidentId(i.id)}
                className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors duration-100 hover:bg-white/4"
              >
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: SEV[i.severity].color }} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12px] font-semibold capitalize text-t1">{i.label}</span>
                  <span className="block font-mono text-[9.5px] text-t3">{i.sourceId} · {timeAgo(i.time, s.now)}</span>
                </span>
                <span className="font-mono text-[11px] font-bold" style={{ color: classColor(i.label) }}>{i.confidence.toFixed(1)}%</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

export default function Live() {
  const s = useStore();
  const src = s.sources.find((c) => c.id === s.activeSourceId);
  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
      <div className="order-2 xl:order-1 xl:col-span-3"><SourceList /></div>

      <div className="order-1 xl:order-2 xl:col-span-6">
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
            <div className="flex items-center gap-3">
              <span className={cx("flex items-center gap-1.5 font-mono text-[11px] font-bold tracking-widest", s.running ? "text-safe" : "text-t3")}>
                <Dot color={s.running ? "#20E3A2" : "#64748B"} pulse={s.running} /> {s.running ? "LIVE" : "IDLE"}
              </span>
              <h3 className="font-mono text-[12.5px] font-bold tracking-wider text-t1">
                {src ? `${src.id} — ${src.location.toUpperCase()}` : "NO SOURCE"}
              </h3>
            </div>
            <div className="flex items-center gap-2.5">
              <ThreatLevelChip />
              <button
                aria-label="Fullscreen"
                onClick={() => s.setFullscreen(true)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-t2 transition-colors duration-150 hover:bg-white/5 hover:text-t1"
              >
                <Maximize2 size={16} />
              </button>
            </div>
          </div>
          <div className="p-4 md:p-5">
            <VideoViewport />
            <div className="mt-4"><DetectionControls /></div>
          </div>
        </Card>

        <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">
          {([
            ["MODEL FPS", s.metrics.fps.toFixed(1), "#22D3EE"],
            ["LATENCY", `${s.metrics.latency}ms`, "#38BDF8"],
            ["THRESHOLD", s.settings.conf.toFixed(2), "#FF9F1C"],
            ["FRAMES", s.metrics.frames.toLocaleString(), "#20E3A2"],
          ] as [string, string, string][]).map(([k, v, c]) => (
            <Card key={k} className="px-4 py-3.5">
              <p className="font-mono text-[9.5px] font-semibold tracking-[0.16em] text-t3">{k}</p>
              <p className="mt-1 font-mono text-[17px] font-bold tabular-nums" style={{ color: c }}>{v}</p>
            </Card>
          ))}
        </div>
      </div>

      <div className="order-3 xl:col-span-3"><LiveIncidents /></div>
    </div>
  );
}
