import React from "react";
import { Crosshair, AlertTriangle, Video, Gauge, ChevronDown, Settings2, Maximize2, MoreHorizontal, ChevronRight, ShieldCheck, Zap } from "lucide-react";
import { useStore } from "../lib/store";
import { Card, CardHead, SevBadge, Dropdown, cx, EmptyState } from "../lib/ui";
import { Tabs } from "../lib/ui";
import { VideoViewport, ThreatLevelChip } from "../lib/layout";
import { DetectionControls } from "../lib/controls";
import { Sparkline, AreaChart } from "../lib/charts";
import { fmtTime, timeAgo, SEV, pad2, classColor } from "../lib/data";

/* ---------- live detection card ---------- */

function LiveDetectionCard() {
  const s = useStore();
  const src = s.sources.find((c) => c.id === s.activeSourceId);
  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
        <div className="flex items-center gap-3.5">
          <h3 className="font-mono text-[12px] font-bold tracking-[0.16em] text-t1">LIVE DETECTION</h3>
          {s.running ? (
            <span className="flex items-center gap-1.5 rounded-md border border-safe/30 bg-safe/10 px-2 py-1 font-mono text-[10.5px] font-bold text-safe">
              <span className="anim-blink h-1.5 w-1.5 rounded-full bg-safe" /> LIVE
            </span>
          ) : (
            <span className="rounded-md border border-line bg-ink px-2 py-1 font-mono text-[10.5px] font-bold text-t3">STANDBY</span>
          )}
        </div>
        <div className="flex items-center gap-2.5">
          <ThreatLevelChip />
          <Dropdown
            button={
              <button className="flex items-center gap-2 rounded-lg border border-line bg-ink px-3 py-2 text-[12px] font-semibold text-t1 transition-colors duration-150 hover:border-edge">
                {src ? `${src.name} — ${src.location}` : "No source"} <ChevronDown size={13} className="text-t3" />
              </button>
            }
            align="right"
            width="w-64"
            items={
              s.sources.length
                ? s.sources.map((c) => ({
                    label: `${c.name} — ${c.location}`,
                    active: c.id === s.activeSourceId,
                    onClick: () => s.setActiveSourceId(c.id),
                  }))
                : [{ label: "No sources yet — add one", onClick: () => s.navigate("cameras") }]
            }
          />
          <IconRow />
        </div>
      </div>
      <div className="p-4 md:p-5">
        <VideoViewport />
        <div className="mt-4"><DetectionControls /></div>
      </div>
    </Card>
  );
}

function IconRow() {
  const s = useStore();
  return (
    <div className="flex items-center gap-1">
      <button aria-label="Fullscreen" onClick={() => s.setFullscreen(true)} className="flex h-9 w-9 items-center justify-center rounded-lg text-t2 transition-colors duration-150 hover:bg-white/5 hover:text-t1"><Maximize2 size={15} /></button>
      <button aria-label="Detection settings" onClick={() => s.navigate("settings")} className="flex h-9 w-9 items-center justify-center rounded-lg text-t2 transition-colors duration-150 hover:bg-white/5 hover:text-t1"><Settings2 size={15} /></button>
      <Dropdown
        align="right"
        button={<button aria-label="More" className="flex h-9 w-9 items-center justify-center rounded-lg text-t2 transition-colors duration-150 hover:bg-white/5 hover:text-t1"><MoreHorizontal size={15} /></button>}
        items={[
          { label: "Threat Logs", onClick: () => s.navigate("logs") },
          { label: "Detection Models", onClick: () => s.navigate("models") },
        ]}
      />
    </div>
  );
}

/* ---------- system status ---------- */

function Bar({ v, color }: { v: number; color: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#1B2536]">
      <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${Math.min(100, Math.max(2, v))}%`, background: color }} />
    </div>
  );
}

function SystemStatus() {
  const s = useStore();
  const e = s.engine;
  const row = (k: string, dot: string, v: string, pulse?: boolean) => (
    <div className="flex items-center justify-between py-[7px]">
      <span className="text-[12px] text-t2">{k}</span>
      <span className="flex items-center gap-2 font-mono text-[11px] font-medium text-t1">
        <span className={cx("h-1.5 w-1.5 rounded-full", pulse && "anim-pulse-soft")} style={{ background: dot }} /> {v}
      </span>
    </div>
  );
  return (
    <Card>
      <CardHead
        title="SYSTEM STATUS"
        right={
          e.state === "ready" ? (
            <span className="font-mono text-[10px] font-bold tracking-wider text-safe">ALL SYSTEMS GO</span>
          ) : e.state === "loading" ? (
            <span className="font-mono text-[10px] font-bold tracking-wider text-pri">LOADING…</span>
          ) : (
            <span className="font-mono text-[10px] font-bold tracking-wider text-threat">ATTENTION</span>
          )
        }
      />
      <div className="px-5 pb-4">
        {row("Model Status", e.state === "ready" ? "#20E3A2" : e.state === "loading" ? "#38BDF8" : "#FF3B4D", e.state === "ready" ? "Loaded" : e.state === "loading" ? "Loading" : "Error", true)}
        {row("Camera", s.sources.length ? "#20E3A2" : "#FF9F1C", s.sources.length ? "Connected" : "No source", true)}
        {row("AI Engine", s.running ? "#20E3A2" : "#64748B", s.running ? "Running" : "Idle", s.running)}
        <div className="my-2 h-px bg-line/70" />
        <div className="space-y-2.5">
          {([
            ["Engine load", s.metrics.load, s.metrics.load > 80 ? "#FF9F1C" : "#22D3EE", `${s.metrics.load}%`],
            ["Inference", Math.min(100, s.metrics.fps * 10), "#3B82F6", `${s.metrics.fps.toFixed(1)} fps`],
            ["Memory", s.metrics.mem ? (s.metrics.mem / 8) * 100 : 40, s.metrics.mem > 6 ? "#FF9F1C" : "#FF9F1C", s.metrics.mem ? `${s.metrics.mem} GB` : "n/a"],
          ] as [string, number, string, string][]).map(([k, v, c, txt]) => (
            <div key={k}>
              <div className="mb-1 flex justify-between font-mono text-[10.5px]">
                <span className="text-t3">{k}</span><span className="text-t2">{txt}</span>
              </div>
              <Bar v={v} color={c} />
            </div>
          ))}
        </div>
        <div className="my-2 h-px bg-line/70" />
        <div className="flex items-center justify-between py-[7px] font-mono text-[11px]">
          <span className="text-t2">Latency</span><span className="text-pri">{s.metrics.latency}ms</span>
        </div>
      </div>
    </Card>
  );
}

/* ---------- recent threats ---------- */

function RecentThreats() {
  const s = useStore();
  const recent = s.incidents.slice(0, 5);
  return (
    <Card>
      <CardHead title="RECENT THREATS" right={
        <button onClick={() => s.navigate("logs")} className="flex items-center gap-1 font-mono text-[10px] font-semibold tracking-wider text-pri transition-colors hover:text-prisoft">
          VIEW ALL <ChevronRight size={11} />
        </button>
      } />
      <div className="px-2.5 pb-3">
        {recent.length === 0 ? (
          <div className="px-3 py-2">
            <EmptyState
              icon={<ShieldCheck size={22} />}
              title="No threats detected"
              sub="AI monitoring is active and the environment appears safe. Detections will appear here in real time."
            />
          </div>
        ) : (
          recent.map((i) => (
            <button
              key={i.id}
              onClick={() => s.setOpenIncidentId(i.id)}
              className="group flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left transition-colors duration-150 hover:bg-white/4"
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: SEV[i.severity].color, boxShadow: `0 0 8px ${SEV[i.severity].color}66` }} />
              {i.img ? (
                <img src={i.img} alt="" className="h-11 w-[68px] shrink-0 rounded-md border border-line object-cover" />
              ) : (
                <span className="flex h-11 w-[68px] shrink-0 items-center justify-center rounded-md border border-line bg-ink font-mono text-[9px] text-t3">NO IMG</span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px] font-semibold capitalize text-t1">{i.label}</span>
                <span className="block font-mono text-[10px] text-t3">{i.sourceId} · {timeAgo(i.time, s.now)}</span>
              </span>
              <span className="flex flex-col items-end gap-1">
                <span className="font-mono text-[11px] font-bold" style={{ color: classColor(i.label) }}>{i.confidence.toFixed(1)}%</span>
                <SevBadge sev={i.severity} />
              </span>
            </button>
          ))
        )}
      </div>
    </Card>
  );
}

/* ---------- analytics row ---------- */

function DetectionAnalytics() {
  const s = useStore();
  const [tab, setTab] = React.useState("24 HOURS");

  const { data, threats, labels } = React.useMemo(() => {
    const buckets = tab === "24 HOURS" ? 24 : tab === "7 DAYS" ? 7 : 30;
    const unit = tab === "24 HOURS" ? 3600_000 : 86400_000;
    const arr = Array(buckets).fill(0) as number[];
    const thr = Array(buckets).fill(0) as number[];
    const nowT = s.now;
    s.incidents.forEach((i) => {
      const idx = buckets - 1 - Math.floor((nowT - i.time) / unit);
      if (idx >= 0 && idx < buckets) { arr[idx]++; thr[idx]++; }
    });
    // include non-threat detections count for "24h" as baseline
    const lbl = Array.from({ length: buckets }, (_, k) =>
      tab === "24 HOURS" ? `${pad2((new Date(nowT).getHours() - (buckets - 1 - k) + 48) % 24)}h` : `-${buckets - 1 - k}d`
    );
    return { data: arr, threats: thr, labels: lbl };
  }, [tab, s.incidents, s.now]);

  const cats = React.useMemo(() => {
    const map = new Map<string, number>();
    s.incidents.forEach((i) => map.set(i.label, (map.get(i.label) ?? 0) + 1));
    return Array.from(map.entries()).map(([label, v]) => ({ label, v, color: classColor(label) })).sort((a, b) => b.v - a.v).slice(0, 4);
  }, [s.incidents]);

  return (
    <Card>
      <CardHead
        title="DETECTION ACTIVITY"
        sub="Generated from your real detection events"
        right={<Tabs tabs={["24 HOURS", "7 DAYS", "30 DAYS"]} active={tab} onChange={setTab} />}
      />
      <div className="p-5">
        {s.incidents.length === 0 ? (
          <EmptyState
            icon={<Zap size={22} />}
            title="No detection data yet"
            sub="Connect a source and run detection — this chart fills up with real events automatically."
          />
        ) : (
          <>
            <AreaChart data={data} threats={threats} labels={labels} height={200} />
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4 sm:grid-cols-4">
              {cats.map((c) => (
                <div key={c.label} className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: c.color }} />
                  <div>
                    <p className="text-[11.5px] capitalize leading-tight text-t2">{c.label}</p>
                    <p className="font-mono text-[14px] font-bold text-t1">{c.v}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </Card>
  );
}

function SystemPerformance() {
  const s = useStore();
  const cards: [string, string, string, number[], string][] = [
    ["Inference FPS", s.metrics.fps.toFixed(1), "#22D3EE", s.sparks.fps, s.metrics.fps > 3 ? "Optimal" : s.running ? "Warming up" : "Idle"],
    ["Latency", `${s.metrics.latency}ms`, "#3B82F6", s.sparks.lat, s.metrics.latency < 80 ? "Optimal" : "Busy"],
    ["Engine load", `${s.metrics.load}%`, s.metrics.load > 80 ? "#FF9F1C" : "#20E3A2", s.sparks.fps.map((f) => Math.min(100, f * 8)), s.metrics.load > 80 ? "High" : "Optimal"],
  ];
  return (
    <Card>
      <CardHead title="SYSTEM PERFORMANCE" sub="Live engine telemetry" right={<Gauge size={15} className="text-t3" />} />
      <div className="space-y-3 p-4">
        {cards.map(([t, v, c, spark, status]) => (
          <div key={t} className="rounded-lg border border-line/70 bg-ink/60 p-3.5">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-mono text-[10px] font-semibold tracking-[0.14em] text-t3">{t.toUpperCase()}</span>
              <span className="flex items-center gap-2">
                <span className="font-mono text-[16px] font-bold tabular-nums" style={{ color: c }}>{v}</span>
                <span className="rounded-md border border-line bg-card px-1.5 py-0.5 font-mono text-[9px] font-semibold text-t2">{status.toUpperCase()}</span>
              </span>
            </div>
            {spark.length > 1 ? <Sparkline data={spark} color={c} h={36} /> : <div className="skeleton h-[36px] w-full" />}
          </div>
        ))}
        <p className="px-1 font-mono text-[9.5px] leading-relaxed tracking-wider text-t3">
          ONNX RUNTIME · WASM · {navigator.hardwareConcurrency ?? 4} THREADS{s.metrics.mem ? ` · ${s.metrics.mem} GB RAM` : ""}
        </p>
      </div>
    </Card>
  );
}

/* ---------- page ---------- */

function Kpi({ label, value, icon, accent, sub }: { label: string; value: string; icon: React.ReactNode; accent: string; sub: string }) {
  return (
    <Card hover className="p-5">
      <div className="flex items-start justify-between">
        <p className="font-mono text-[10px] font-semibold tracking-[0.16em] text-t3">{label}</p>
        <span className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ color: accent, background: `${accent}12`, border: `1px solid ${accent}2e` }}>{icon}</span>
      </div>
      <p className="mt-3 font-mono text-[27px] font-bold leading-none tabular-nums" style={{ color: accent }}>{value}</p>
      <p className="mt-2.5 text-[11.5px] text-t3">{sub}</p>
    </Card>
  );
}

export default function Dashboard() {
  const s = useStore();
  const online = s.sources.filter((c) => c.status === "online").length;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="TOTAL DETECTIONS" value={s.stats.totalDetections.toLocaleString()} icon={<Crosshair size={17} />} accent="#22D3EE" sub="counted by the live model" />
        <Kpi label="THREATS DETECTED" value={String(s.incidents.length)} icon={<AlertTriangle size={17} />} accent="#FF3B4D" sub={`${s.stats.threatsToday} today`} />
        <Kpi label="SOURCES ONLINE" value={`${online} / ${s.sources.length}`} icon={<Video size={17} />} accent="#20E3A2" sub={s.sources.length ? `${Math.round((online / s.sources.length) * 100)}% operational` : "no sources added"} />
        <Kpi label="SYSTEM FPS" value={s.metrics.fps.toFixed(1)} icon={<Gauge size={17} />} accent="#38BDF8" sub={s.running ? `inference · ${s.metrics.latency}ms` : "detection paused"} />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-10">
        <div className="space-y-5 xl:col-span-7"><LiveDetectionCard /></div>
        <div className="space-y-5 xl:col-span-3">
          <SystemStatus />
          <RecentThreats />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-10">
        <div className="xl:col-span-7"><DetectionAnalytics /></div>
        <div className="xl:col-span-3"><SystemPerformance /></div>
      </div>
    </div>
  );
}
