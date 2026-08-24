import React, { useMemo, useState } from "react";
import { Crosshair, AlertTriangle, Gauge, Clock, CalendarDays } from "lucide-react";
import { useStore } from "../lib/store";
import { Card, CardHead, Tabs, Input, cx } from "../lib/ui";
import { AreaChart, BarsChart, HBars, Donut } from "../lib/charts";
import {
  DET_24, THR_24, DET_7, THR_7, DET_30, THR_30, CAM_COMPARE, HOUR_THREATS, CONF_DIST, CATEGORIES, pad2,
} from "../lib/data";

const RANGES = ["Today", "7 Days", "30 Days", "Custom Range"];

export default function Analytics() {
  const s = useStore();
  const [range, setRange] = useState("7 Days");

  const { data, threats, labels } = useMemo(() => {
    if (range === "Today") {
      const h = new Date(s.now).getHours();
      return { data: DET_24, threats: THR_24, labels: Array.from({ length: 24 }, (_, i) => `${pad2((h - 23 + i + 24) % 24)}h`) };
    }
    if (range === "30 Days") {
      return {
        data: DET_30, threats: THR_30,
        labels: Array.from({ length: 30 }, (_, i) => {
          const d = new Date(s.now - (29 - i) * 86400_000);
          return `${d.getDate()}/${d.getMonth() + 1}`;
        }),
      };
    }
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const d0 = new Date(s.now);
    return { data: DET_7, threats: THR_7, labels: Array.from({ length: 7 }, (_, i) => days[(d0.getDay() - 6 + i + 14) % 7]) };
  }, [range, s.now]);

  const totalDet = data.reduce((a, b) => a + b, 0);
  const totalThr = threats.reduce((a, b) => a + b, 0);
  const peakIdx = data.indexOf(Math.max(...data));
  const scale = range === "Today" ? 1 : range === "30 Days" ? 4 : 2;

  const kpis = [
    { label: "TOTAL DETECTIONS", v: `${totalDet * scale}`, icon: <Crosshair size={16} />, c: "#22D3EE", sub: "all classes" },
    { label: "HIGH-RISK EVENTS", v: `${totalThr * scale + 6}`, icon: <AlertTriangle size={16} />, c: "#FF3B4D", sub: "severity ≥ HIGH" },
    { label: "AVG CONFIDENCE", v: "91.4%", icon: <Gauge size={16} />, c: "#38BDF8", sub: "across confirmed threats" },
    { label: "PEAK DETECTION TIME", v: `${labels[peakIdx]}`, icon: <Clock size={16} />, c: "#FF9F1C", sub: "highest activity window" },
  ];

  const donutItems = CATEGORIES.map((c) => ({ label: c.label, v: Math.round(c.v * (scale / 2)), color: c.color }));
  const donutTotal = donutItems.reduce((a, b) => a + b.v, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs tabs={RANGES} active={range} onChange={setRange} />
        {range === "Custom Range" && (
          <div className="anim-fadeup flex items-center gap-2.5">
            <CalendarDays size={15} className="text-t3" />
            <Input type="date" defaultValue="2026-08-01" className="w-[158px]" aria-label="From date" />
            <span className="text-t3">→</span>
            <Input type="date" defaultValue="2026-08-22" className="w-[158px]" aria-label="To date" />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label} hover className="p-5">
            <div className="flex items-start justify-between">
              <p className="font-mono text-[10px] font-semibold tracking-[0.16em] text-t3">{k.label}</p>
              <span className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ color: k.c, background: `${k.c}12`, border: `1px solid ${k.c}2e` }}>{k.icon}</span>
            </div>
            <p className="mt-3 font-mono text-[27px] font-bold leading-none tabular-nums" style={{ color: k.c }}>{k.v}</p>
            <p className="mt-2.5 text-[11.5px] text-t3">{k.sub}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHead title="DETECTION FREQUENCY" sub={`Detections per interval · ${range.toLowerCase()}`} right={
            <span className="flex items-center gap-4 font-mono text-[9.5px] text-t3">
              <span className="flex items-center gap-1.5"><span className="h-1.5 w-3 rounded bg-pri" />DETECTIONS</span>
              <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-threat" />THREATS</span>
            </span>
          } />
          <div className="p-5"><AreaChart data={data} threats={threats} labels={labels} height={230} /></div>
        </Card>

        <Card>
          <CardHead title="THREAT DISTRIBUTION" sub="By detection class" />
          <div className="p-5">
            <Donut items={donutItems} centerLabel={`${donutTotal}`} centerSub="EVENTS" />
            <p className={cx("mt-5 border-t border-line pt-4 text-[11.5px] leading-relaxed text-t3")}>
              Firearm-class detections dominate evening windows. Knife-class events cluster near parking structures.
            </p>
          </div>
        </Card>

        <Card>
          <CardHead title="CAMERA COMPARISON" sub="Confirmed threats by source" />
          <div className="p-5"><HBars items={CAM_COMPARE.map((c, i) => ({ ...c, color: i < 2 ? "#FF3B4D" : i < 4 ? "#FF9F1C" : "#22D3EE" }))} /></div>
        </Card>

        <Card className="xl:col-span-2">
          <CardHead title="HOURLY THREAT ACTIVITY" sub="Threat events by hour of day — 30 day aggregate" />
          <div className="p-5">
            <BarsChart data={HOUR_THREATS} color="#FF3B4D" height={190} labels={Array.from({ length: 24 }, (_, i) => `${pad2(i)}h`)} />
          </div>
        </Card>

        <Card className="xl:col-span-3">
          <CardHead title="MODEL CONFIDENCE DISTRIBUTION" sub="Where Weapon Detector v2 places its convictions" right={
            <span className="font-mono text-[10px] tracking-wider text-t3">99 EVENTS SAMPLED</span>
          } />
          <div className="p-5">
            <BarsChart data={CONF_DIST.map((c) => c.v)} color="#22D3EE" height={170} labels={CONF_DIST.map((c) => c.label)} />
          </div>
        </Card>
      </div>
    </div>
  );
}
