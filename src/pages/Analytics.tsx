import React, { useMemo, useState } from "react";
import { Crosshair, AlertTriangle, Gauge, Clock, CalendarDays, BarChart3 } from "lucide-react";
import { useStore } from "../lib/store";
import { Card, CardHead, Tabs, Input, EmptyState } from "../lib/ui";
import { AreaChart, BarsChart, HBars, Donut } from "../lib/charts";
import { pad2, classColor } from "../lib/data";

const RANGES = ["Today", "7 Days", "30 Days", "Custom Range"];

export default function Analytics() {
  const s = useStore();
  const [range, setRange] = useState("7 Days");

  const { buckets, unit, labels } = useMemo(() => {
    if (range === "Today") {
      return {
        buckets: 24, unit: 3600_000,
        labels: Array.from({ length: 24 }, (_, i) => `${pad2((new Date(s.now).getHours() - 23 + i + 48) % 24)}h`),
      };
    }
    const n = range === "30 Days" ? 30 : 7;
    return {
      buckets: n, unit: 86400_000,
      labels: Array.from({ length: n }, (_, i) => {
        const d = new Date(s.now - (n - 1 - i) * 86400_000);
        return `${d.getDate()}/${d.getMonth() + 1}`;
      }),
    };
  }, [range, s.now]);

  const data = useMemo(() => {
    const det = Array(buckets).fill(0) as number[];
    const thr = Array(buckets).fill(0) as number[];
    s.incidents.forEach((i) => {
      const idx = buckets - 1 - Math.floor((s.now - i.time) / unit);
      if (idx >= 0 && idx < buckets) { det[idx]++; thr[idx]++; }
    });
    return { det, thr };
  }, [s.incidents, buckets, unit, s.now]);

  const cats = useMemo(() => {
    const map = new Map<string, number>();
    s.incidents.forEach((i) => map.set(i.label, (map.get(i.label) ?? 0) + 1));
    return Array.from(map.entries()).map(([label, v]) => ({ label, v, color: classColor(label) })).sort((a, b) => b.v - a.v);
  }, [s.incidents]);

  const camCompare = useMemo(() => {
    const map = new Map<string, number>();
    s.incidents.forEach((i) => map.set(i.sourceId, (map.get(i.sourceId) ?? 0) + 1));
    return Array.from(map.entries()).map(([label, v]) => ({ label, v })).sort((a, b) => b.v - a.v).slice(0, 6);
  }, [s.incidents]);

  const hourly = useMemo(() => {
    const h = Array(24).fill(0) as number[];
    s.incidents.forEach((i) => { h[new Date(i.time).getHours()]++; });
    return h;
  }, [s.incidents]);

  const confDist = useMemo(() => {
    const bins = [0, 0, 0, 0, 0];
    s.incidents.forEach((i) => {
      if (i.confidence < 70) bins[0]++;
      else if (i.confidence < 80) bins[1]++;
      else if (i.confidence < 90) bins[2]++;
      else if (i.confidence < 95) bins[3]++;
      else bins[4]++;
    });
    return bins;
  }, [s.incidents]);

  const avgConf = s.incidents.length ? s.incidents.reduce((a, b) => a + b.confidence, 0) / s.incidents.length : 0;
  const peakIdx = data.det.indexOf(Math.max(...data.det, 0));
  const highRisk = s.incidents.filter((i) => i.severity === "HIGH" || i.severity === "CRITICAL").length;

  const kpis = [
    { label: "TOTAL DETECTIONS", v: `${s.incidents.length}`, icon: <Crosshair size={16} />, c: "#22D3EE", sub: "confirmed threat events" },
    { label: "HIGH-RISK EVENTS", v: `${highRisk}`, icon: <AlertTriangle size={16} />, c: "#FF3B4D", sub: "severity HIGH or CRITICAL" },
    { label: "AVG CONFIDENCE", v: avgConf ? `${avgConf.toFixed(1)}%` : "—", icon: <Gauge size={16} />, c: "#38BDF8", sub: "across all incidents" },
    { label: "PEAK WINDOW", v: s.incidents.length ? labels[peakIdx] : "—", icon: <Clock size={16} />, c: "#FF9F1C", sub: "highest activity bucket" },
  ];

  const empty = s.incidents.length === 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs tabs={RANGES} active={range} onChange={setRange} />
        {range === "Custom Range" && (
          <div className="anim-fadeup flex items-center gap-2.5">
            <CalendarDays size={15} className="text-t3" />
            <Input type="date" defaultValue={new Date(s.now - 6 * 86400_000).toISOString().slice(0, 10)} className="w-[158px]" aria-label="From date" />
            <span className="text-t3">→</span>
            <Input type="date" defaultValue={new Date(s.now).toISOString().slice(0, 10)} className="w-[158px]" aria-label="To date" />
          </div>
        )}
      </div>

      {empty && (
        <Card>
          <div className="py-8">
            <EmptyState
              icon={<BarChart3 size={24} />}
              title="No analytics data yet"
              sub="Analytics are computed 100% from your real detection events. Connect a source, run detection, and every chart below fills with live data."
            />
          </div>
        </Card>
      )}

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
          <CardHead title="DETECTION FREQUENCY" sub={`Real events per interval · ${range.toLowerCase()}`} right={
            <span className="flex items-center gap-4 font-mono text-[9.5px] text-t3">
              <span className="flex items-center gap-1.5"><span className="h-1.5 w-3 rounded bg-pri" />EVENTS</span>
              <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-threat" />THREATS</span>
            </span>
          } />
          <div className="p-5">
            {empty ? <p className="py-10 text-center text-[12.5px] text-t3">Waiting for real events…</p> : <AreaChart data={data.det} threats={data.thr} labels={labels} height={230} />}
          </div>
        </Card>

        <Card>
          <CardHead title="THREAT DISTRIBUTION" sub="By detected class" />
          <div className="p-5">
            {empty ? <p className="py-10 text-center text-[12.5px] text-t3">No data yet.</p> : (
              <Donut items={cats.slice(0, 5)} centerLabel={`${s.incidents.length}`} centerSub="EVENTS" />
            )}
          </div>
        </Card>

        <Card>
          <CardHead title="SOURCE COMPARISON" sub="Threats by source" />
          <div className="p-5">
            {empty ? <p className="py-10 text-center text-[12.5px] text-t3">No data yet.</p> : (
              <HBars items={camCompare.map((c, i) => ({ ...c, color: i < 2 ? "#FF3B4D" : i < 4 ? "#FF9F1C" : "#22D3EE" }))} />
            )}
          </div>
        </Card>

        <Card className="xl:col-span-2">
          <CardHead title="HOURLY THREAT ACTIVITY" sub="Events by hour of day" />
          <div className="p-5">
            {empty ? <p className="py-10 text-center text-[12.5px] text-t3">No data yet.</p> : (
              <BarsChart data={hourly} color="#FF3B4D" height={190} labels={Array.from({ length: 24 }, (_, i) => `${pad2(i)}h`)} />
            )}
          </div>
        </Card>

        <Card className="xl:col-span-3">
          <CardHead title="MODEL CONFIDENCE DISTRIBUTION" sub="Where your model places its convictions" right={
            <span className="font-mono text-[10px] tracking-wider text-t3">{s.incidents.length} EVENTS</span>
          } />
          <div className="p-5">
            {empty ? <p className="py-10 text-center text-[12.5px] text-t3">No data yet.</p> : (
              <BarsChart data={confDist} color="#22D3EE" height={170} labels={["<70", "70–79", "80–89", "90–94", "95+"]} />
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
