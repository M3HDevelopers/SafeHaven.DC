import React from "react";
import { Radar, ShieldCheck, Maximize2, AlertTriangle } from "lucide-react";
import { useStore } from "../lib/store";
import { Card, CardHead, Button, Dot, SevBadge, cx, EmptyState } from "../lib/ui";
import { VideoViewport, ThreatLevelChip } from "../lib/layout";
import { DetectionControls } from "../lib/controls";
import { SEV, TYPE_COLOR, fmtTime, timeAgo } from "../lib/data";

function CameraList() {
  const s = useStore();
  return (
    <Card className="overflow-hidden">
      <CardHead title="CAMERAS" sub={`${s.cameras.filter((c) => c.status === "online").length} of ${s.cameras.length} online`} icon={<Radar size={15} />} />
      <div className="thin-scroll max-h-[560px] overflow-y-auto">
        {s.cameras.map((c) => {
          const active = c.id === s.activeCamId;
          const online = c.status === "online";
          return (
            <button
              key={c.id}
              onClick={() => s.setActiveCamId(c.id)}
              className={cx(
                "flex w-full items-center gap-3 border-l-[3px] px-4 py-3 text-left transition-all duration-150",
                active ? "border-pri bg-pri/6" : "border-transparent hover:bg-white/3"
              )}
            >
              <span className={cx("relative shrink-0", !online && "opacity-50 grayscale")}>
                <img src={c.img} alt="" className="h-12 w-[76px] rounded-md border border-line object-cover" style={{ filter: "saturate(0.7)" }} />
                <span className={cx("absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-card", online ? "bg-safe" : "bg-threat")} />
              </span>
              <span className="min-w-0 flex-1">
                <span className={cx("block truncate text-[12.5px] font-semibold", active ? "text-t1" : "text-t2")}>{c.name}</span>
                <span className="block truncate text-[11px] text-t3">{c.location}</span>
                <span className="mt-1 flex items-center gap-2.5 font-mono text-[9.5px] text-t3">
                  <span className={online ? "text-pri" : "text-threat"}>{online ? `${c.fps.toFixed(0)} FPS` : "OFFLINE"}</span>
                  {c.threats > 0 && <span className="text-warn">{c.threats} threats</span>}
                </span>
              </span>
            </button>
          );
        })}
      </div>
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
        at ? <SevBadge sev={at.inc.severity} pulse /> : (
          <span className="font-mono text-[10px] font-semibold tracking-wider text-safe">CLEAR</span>
        )
      } />
      <div className="p-4">
        {at ? (
          <div
            className={cx("anim-pop rounded-xl border p-4", at.inc.severity === "CRITICAL" ? "anim-pulse-crit" : "")}
            style={{ borderColor: `${SEV[at.inc.severity].color}55`, background: SEV[at.inc.severity].bg }}
          >
            <p className="font-mono text-[11px] font-bold tracking-[0.16em]" style={{ color: SEV[at.inc.severity].color }}>
              {at.inc.severity === "CRITICAL" ? "CRITICAL THREAT" : `${at.inc.severity} THREAT`}
            </p>
            <p className="mt-1.5 text-[13.5px] font-bold text-t1">
              {at.inc.type === "Potential Weapon" ? "Potential weapon detected" : at.inc.type === "Knife" ? "Knife detected" : "Suspicious object detected"}
            </p>
            <div className="mt-3 space-y-1 font-mono text-[10.5px] text-t2">
              <p className="flex justify-between"><span className="text-t3">CAMERA</span>{at.inc.cameraName}</p>
              <p className="flex justify-between"><span className="text-t3">CONFIDENCE</span><span className="font-bold" style={{ color: SEV[at.inc.severity].color }}>{at.inc.confidence.toFixed(1)}%</span></p>
              <p className="flex justify-between"><span className="text-t3">DETECTED</span>{fmtTime(at.inc.time)}</p>
            </div>
            <div className="mt-4 flex gap-2">
              <Button variant="danger" size="sm" className="flex-1" onClick={() => s.setOpenIncidentId(at.inc.id)}>VIEW INCIDENT</Button>
              <Button variant="ghost" size="sm" onClick={() => s.dismissAlert(s.alerts.find((a) => a.incidentId === at.inc.id)?.id ?? -1)}>DISMISS</Button>
            </div>
          </div>
        ) : (
          <EmptyState
            icon={<ShieldCheck size={22} />}
            title="Everything is clear."
            sub="AI monitoring is active. Threats will appear here the moment they are detected."
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
                  <span className="block truncate text-[12px] font-semibold text-t1">{i.type}</span>
                  <span className="block font-mono text-[9.5px] text-t3">{i.cameraId} · {timeAgo(i.time, s.now)}</span>
                </span>
                <span className="font-mono text-[11px] font-bold" style={{ color: TYPE_COLOR[i.type] }}>{i.confidence.toFixed(1)}%</span>
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
  const cam = s.cameras.find((c) => c.id === s.activeCamId);
  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
      <div className="order-2 xl:order-1 xl:col-span-3"><CameraList /></div>

      <div className="order-1 xl:order-2 xl:col-span-6">
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 font-mono text-[11px] font-bold tracking-widest text-safe">
                <Dot color="#20E3A2" pulse /> LIVE
              </span>
              <h3 className="font-mono text-[12.5px] font-bold tracking-wider text-t1">
                {cam?.id} — {cam?.location.toUpperCase()}
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
            <div className="mt-4">
              <DetectionControls />
            </div>
          </div>
        </Card>

        <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">
          {([
            ["PROCESSED", `${Math.round(((s.now - new Date(s.now).setHours(0, 0, 0, 0)) * s.metrics.fps) / 1000 + 184_320).toLocaleString()}`, "#22D3EE"],
            ["LATENCY", `${s.metrics.latency}ms`, "#38BDF8"],
            ["THRESHOLD", s.settings.conf.toFixed(2), "#FF9F1C"],
            ["QUEUE", s.incidents.filter((i) => i.status === "New").length.toString(), "#FF3B4D"],
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
