import React, { useMemo, useState } from "react";
import {
  Crosshair, AlertTriangle, Camera as CameraIcon, Gauge, Maximize2, Settings2, MoreHorizontal,
  Cpu, Activity, CheckCircle2, Radar, ShieldCheck,
} from "lucide-react";
import { useStore } from "../lib/store";
import { Card, CardHead, Button, IconBtn, Dot, SevBadge, Select, Tabs, cx, useTween, Bar, EmptyState, Dropdown } from "../lib/ui";
import { VideoViewport, ThreatLevelChip } from "../lib/layout";
import { DetectionControls } from "../lib/controls";
import { AreaChart, Sparkline } from "../lib/charts";
import { DET_24, THR_24, DET_7, THR_7, DET_30, THR_30, CATEGORIES, SEV, timeAgo, fmtTime, pad2 } from "../lib/data";

function MetricCard({
  label, value, decimals = 0, sub, subColor, accent, icon,
}: { label: string; value: number; decimals?: number; sub: string; subColor: string; accent: string; icon: React.ReactNode }) {
  const v = useTween(value);
  return (
    <Card hover className="p-5">
      <div className="flex items-start justify-between">
        <p className="font-mono text-[10px] font-semibold tracking-[0.16em] text-t3">{label}</p>
        <span className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ color: accent, background: `${accent}12`, border: `1px solid ${accent}2e` }}>
          {icon}
        </span>
      </div>
      <p className="mt-3 font-mono text-[29px] font-bold leading-none tabular-nums text-t1">
        {v.toFixed(decimals)}
      </p>
      <p className="mt-2.5 text-[11.5px] font-semibold" style={{ color: subColor }}>{sub}</p>
    </Card>
  );
}

function SystemStatusPanel() {
  const s = useStore();
  const memColor = s.metrics.mem > 75 ? "#FF9F1C" : "#3B82F6";
  const rows: [string, string, boolean][] = [
    ["Model Status", "Loaded", true],
    ["Camera Uplink", "Online", true],
    ["AI Engine", "Running", s.running],
  ];
  return (
    <Card>
      <CardHead title="SYSTEM STATUS" icon={<Activity size={15} />} right={<ThreatLevelChip />} />
      <div className="p-5">
        {/* AI engine block */}
        <div className="mb-5 rounded-lg border border-pri/25 bg-pri/5 p-3.5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 font-mono text-[10.5px] font-bold tracking-[0.16em] text-pri">
              <span className="relative flex h-4 w-4 items-center justify-center">
                <span className="absolute inset-0 rounded-full border border-pri/40" style={{ animation: "kf-sweep 3s linear infinite", borderTopColor: "#22D3EE" }} />
                <span className="h-1.5 w-1.5 rounded-full bg-pri" />
              </span>
              AI ENGINE
            </span>
            <span className="flex items-center gap-1.5 font-mono text-[10px] font-bold text-safe"><Dot color="#20E3A2" pulse />ONLINE</span>
          </div>
          <div className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[10.5px]">
            <span className="text-t3">MODEL <span className="ml-1 text-t2">Weapon Detector v2</span></span>
            <span className="text-t3">INFER <span className="ml-1 text-pri">{s.metrics.fps.toFixed(1)} FPS</span></span>
            <span className="text-t3">ACC <span className="ml-1 text-t2">92.4%</span></span>
            <span className="text-t3">LATENCY <span className="ml-1 text-t2">{s.metrics.latency}ms</span></span>
          </div>
        </div>

        <div className="space-y-2.5">
          {rows.map(([k, v, ok]) => (
            <div key={k} className="flex items-center justify-between text-[12.5px]">
              <span className="text-t3">{k}</span>
              <span className={cx("flex items-center gap-2 font-mono text-[11px] font-semibold", ok ? "text-safe" : "text-warn")}>
                <Dot color={ok ? "#20E3A2" : "#FF9F1C"} pulse={ok} /> {v.toUpperCase()}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-5 space-y-3.5 border-t border-line pt-4">
          {([
            ["GPU", s.metrics.gpu, "#22D3EE"],
            ["CPU", s.metrics.cpu, "#3B82F6"],
            ["Memory", s.metrics.mem, memColor],
          ] as [string, number, string][]).map(([k, v, c]) => (
            <div key={k}>
              <div className="mb-1.5 flex justify-between font-mono text-[11px]">
                <span className="text-t3">{k}</span>
                <span className="font-bold tabular-nums" style={{ color: c }}>{v}%</span>
              </div>
              <Bar pct={v} color={c} />
            </div>
          ))}
          <div className="flex items-center justify-between border-t border-line pt-3.5 font-mono text-[11px]">
            <span className="text-t3">FPS</span><span className="font-bold text-pri">{s.metrics.fps.toFixed(1)}</span>
          </div>
          <div className="flex items-center justify-between font-mono text-[11px]">
            <span className="text-t3">Latency</span><span className="font-bold text-t2">{s.metrics.latency}ms</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

function RecentThreats() {
  const s = useStore();
  const recent = s.incidents.slice(0, 5);
  return (
    <Card>
      <CardHead
        title="RECENT THREATS"
        icon={<AlertTriangle size={15} />}
        right={
          <Button variant="ghost" size="sm" onClick={() => s.navigate("logs")}>VIEW ALL</Button>
        }
      />
      {recent.length === 0 ? (
        <EmptyState icon={<ShieldCheck size={22} />} title="No threats detected" sub="AI monitoring is active and the environment appears safe." />
      ) : (
        <div>
          {recent.map((i) => (
            <button
              key={i.id}
              onClick={() => s.setOpenIncidentId(i.id)}
              className="flex w-full items-center gap-3 border-b border-line/60 px-4 py-3 text-left transition-colors duration-100 last:border-0 hover:bg-pri/4"
            >
              <span className="relative shrink-0">
                <img src={i.img} alt="" className="h-11 w-[70px] rounded-md border border-line object-cover" style={{ filter: "saturate(0.7)" }} />
                <span className="absolute -left-1 -top-1 h-2.5 w-2.5 rounded-full border border-card" style={{ background: SEV[i.severity].color }} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px] font-semibold text-t1">{i.type}</span>
                <span className="block font-mono text-[10px] text-t3">{i.cameraId} · {timeAgo(i.time, s.now)}</span>
              </span>
              <span className="text-right">
                <span className="block font-mono text-[11.5px] font-bold" style={{ color: SEV[i.severity].color }}>{i.confidence.toFixed(1)}%</span>
                <SevBadge sev={i.severity} />
              </span>
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}

export default function Dashboard() {
  const s = useStore();
  const [range, setRange] = useState("24 HOURS");
  const online = s.cameras.filter((c) => c.status === "online").length;
  const total = s.cameras.length;
  const cam = s.cameras.find((c) => c.id === s.activeCamId);

  const { data, threats, labels } = useMemo(() => {
    const nowD = new Date(s.now);
    if (range === "7 DAYS") {
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      return {
        data: DET_7, threats: THR_7,
        labels: Array.from({ length: 7 }, (_, i) => days[(nowD.getDay() - 6 + i + 14) % 7]),
      };
    }
    if (range === "30 DAYS") {
      return {
        data: DET_30, threats: THR_30,
        labels: Array.from({ length: 30 }, (_, i) => {
          const d = new Date(s.now - (29 - i) * 86400_000);
          return `${d.getDate()}/${d.getMonth() + 1}`;
        }),
      };
    }
    const h = nowD.getHours();
    return {
      data: DET_24, threats: THR_24,
      labels: Array.from({ length: 24 }, (_, i) => `${pad2((h - 23 + i + 24) % 24)}:00`),
    };
  }, [range, s.now]);

  return (
    <div className="space-y-5">
      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="TOTAL DETECTIONS" value={s.stats.total} sub="▲ +14.2% today" subColor="#20E3A2" accent="#22D3EE" icon={<Crosshair size={16} />} />
        <MetricCard label="THREATS DETECTED" value={s.stats.threatsToday} sub="▲ +6 today" subColor="#FF3B4D" accent="#FF3B4D" icon={<AlertTriangle size={16} />} />
        <MetricCard label="CAMERAS ONLINE" value={online} sub={`${Math.round((online / Math.max(1, total)) * 100)}% operational · ${online} / ${total}`} subColor="#20E3A2" accent="#20E3A2" icon={<CameraIcon size={16} />} />
        <MetricCard label="SYSTEM FPS" value={s.metrics.fps} decimals={1} sub={s.running ? "Excellent" : "Standby"} subColor={s.running ? "#22D3EE" : "#64748B"} accent="#22D3EE" icon={<Gauge size={16} />} />
      </div>

      {/* main monitoring row */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-10">
        <Card className="xl:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 font-mono text-[11px] font-bold tracking-widest text-safe">
                <Dot color="#20E3A2" pulse /> LIVE
              </span>
              <span className="hidden h-4 w-px bg-line sm:block" />
              <h3 className="text-[13px] font-bold tracking-[0.08em] text-t1">LIVE DETECTION</h3>
            </div>
            <div className="flex items-center gap-2.5">
              <Select
                ariaLabel="Select camera"
                className="w-[228px]"
                value={s.activeCamId}
                onChange={(v) => s.setActiveCamId(v)}
                options={s.cameras.map((c) => ({ value: c.id, label: `${c.name} — ${c.location}${c.status === "offline" ? " (offline)" : ""}` }))}
              />
              <ThreatLevelChip />
              <span className="hidden items-center gap-1 md:flex">
                <IconBtn label="Fullscreen" onClick={() => s.setFullscreen(true)}><Maximize2 size={16} /></IconBtn>
                <IconBtn label="Detection settings" onClick={() => s.navigate("settings", { tab: "detection" })}><Settings2 size={16} /></IconBtn>
                <Dropdown
                  button={<IconBtn label="More options"><MoreHorizontal size={16} /></IconBtn>}
                  items={[
                    { label: "Open Live Detection", icon: <Radar size={14} />, onClick: () => s.navigate("live") },
                    { label: "Capture snapshot", icon: <Crosshair size={14} />, onClick: () => s.snapshot() },
                    { label: "Threat logs", icon: <AlertTriangle size={14} />, onClick: () => s.navigate("logs") },
                  ]}
                />
              </span>
            </div>
          </div>

          <div className="p-4 md:p-5">
            <VideoViewport />
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <DetectionControls />
              <span className="hidden font-mono text-[10.5px] tracking-wider text-t3 lg:block">
                {cam?.id} · {cam?.resolution} · SPACE TO TOGGLE
              </span>
            </div>
          </div>
        </Card>

        <div className="space-y-5 xl:col-span-3">
          <SystemStatusPanel />
          <RecentThreats />
        </div>
      </div>

      {/* analytics row */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-10">
        <Card className="xl:col-span-7">
          <CardHead
            title="DETECTION ACTIVITY"
            sub="Detections vs confirmed threat events"
            icon={<Activity size={15} />}
            right={<Tabs size="sm" tabs={["24 HOURS", "7 DAYS", "30 DAYS"]} active={range} onChange={setRange} />}
          />
          <div className="p-5">
            <AreaChart data={data} threats={threats} labels={labels} height={228} />
            <div className="mt-5 grid grid-cols-3 gap-3 border-t border-line pt-4">
              {CATEGORIES.map((c) => (
                <div key={c.label} className="rounded-lg border border-line bg-ink px-3.5 py-3">
                  <p className="flex items-center gap-2 text-[11.5px] text-t2">
                    <span className="h-2 w-2 rounded-sm" style={{ background: c.color }} /> {c.label}
                  </p>
                  <p className="mt-1.5 font-mono text-[21px] font-bold tabular-nums text-t1">{c.v}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="xl:col-span-3">
          <CardHead title="SYSTEM PERFORMANCE" icon={<Cpu size={15} />} right={
            <span className="flex items-center gap-1.5 rounded-full bg-safe/10 px-2.5 py-1 font-mono text-[10px] font-bold text-safe">
              <CheckCircle2 size={11} /> OPTIMAL
            </span>
          } />
          <div className="space-y-5 p-5">
            {([
              ["CPU USAGE", `${s.metrics.cpu}%`, s.sparks.cpu, "#3B82F6"],
              ["GPU USAGE", `${s.metrics.gpu}%`, s.sparks.gpu, "#22D3EE"],
              ["FRAME RATE", s.metrics.fps.toFixed(1), s.sparks.fps, "#38BDF8"],
            ] as [string, string, number[], string][]).map(([label, val, arr, color]) => (
              <div key={label} className="rounded-lg border border-line bg-ink p-3.5">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-mono text-[10px] font-semibold tracking-[0.14em] text-t3">{label}</span>
                  <span className="font-mono text-[14px] font-bold tabular-nums" style={{ color }}>{val}</span>
                </div>
                <Sparkline data={arr} color={color} h={36} />
              </div>
            ))}
            <p className="flex items-center gap-2 text-[11.5px] text-t3">
              <Dot color="#20E3A2" pulse /> All inference pipelines nominal · auto-recovery armed.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
