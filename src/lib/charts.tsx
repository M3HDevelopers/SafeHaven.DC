import React, { useState } from "react";

/* All charts are hand-rolled SVG — clean, dependency-free, theme-matched. */

function pathFrom(data: number[], w: number, h: number, pad = 6, max?: number) {
  const mx = max ?? Math.max(...data, 1);
  const n = data.length;
  const pts = data.map((v, i) => [pad + (i / (n - 1)) * (w - pad * 2), h - pad - (v / mx) * (h - pad * 2)]);
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  return { d, pts, mx };
}

export function Sparkline({
  data,
  color = "#22D3EE",
  h = 38,
  fill = true,
}: { data: number[]; color?: string; h?: number; fill?: boolean }) {
  const w = 140;
  const { d, pts } = pathFrom(data, w, h, 4);
  const area = `${d} L${pts[pts.length - 1][0]},${h} L${pts[0][0]},${h} Z`;
  const gid = React.useId().replace(/:/g, "");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: h }} preserveAspectRatio="none" aria-hidden>
      {fill && (
        <>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.22" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill={`url(#${gid})`} />
        </>
      )}
      <path d={d} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.4" fill={color} />
    </svg>
  );
}

export function AreaChart({
  data,
  threats,
  labels,
  color = "#22D3EE",
  height = 240,
  unit = "",
}: { data: number[]; threats?: number[]; labels: string[]; color?: string; height?: number; unit?: string }) {
  const W = 640;
  const H = 250;
  const [hover, setHover] = useState<number | null>(null);
  const { d, pts, mx } = pathFrom(data, W, H - 26, 8);
  const gid = React.useId().replace(/:/g, "");
  const area = `${d} L${pts[pts.length - 1][0]},${H - 26} L${pts[0][0]},${H - 26} Z`;
  const step = Math.max(1, Math.ceil(labels.length / 8));
  const niceMax = Math.ceil(mx / 4) * 4;

  return (
    <div
      className="relative"
      onMouseLeave={() => setHover(null)}
      onMouseMove={(e) => {
        const r = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
        const p = (e.clientX - r.left) / r.width;
        setHover(Math.min(data.length - 1, Math.max(0, Math.round(p * (data.length - 1)))));
      }}
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }} preserveAspectRatio="none">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75, 1].map((f) => {
          const gy = 10 + (1 - f) * (H - 26 - 10);
          return <line key={f} x1="8" x2={W - 8} y1={gy} y2={gy} stroke="#1B2536" strokeWidth="1" strokeDasharray={f === 1 ? "" : "3 5"} />;
        })}
        <path d={area} fill={`url(#${gid})`} />
        <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {threats &&
          threats.map((t, i) =>
            t > 0 ? (
              <circle key={i} cx={pts[i][0]} cy={pts[i][1]} r="3.4" fill="#FF3B4D" stroke="#080C14" strokeWidth="1.4" />
            ) : null
          )}
        {hover !== null && (
          <line x1={pts[hover][0]} x2={pts[hover][0]} y1="10" y2={H - 26} stroke="#38BDF8" strokeWidth="1" strokeDasharray="3 3" opacity="0.7" />
        )}
      </svg>
      <div className="flex justify-between px-1 font-mono text-[10px] text-t3">
        {labels.map((l, i) => (i % step === 0 ? <span key={i}>{l}</span> : null))}
      </div>
      {hover !== null && (
        <div
          className="pointer-events-none absolute -top-1 z-10 -translate-x-1/2 rounded-lg border border-line bg-raise px-3 py-1.5 font-mono text-[11px] shadow-xl"
          style={{ left: `${(hover / (data.length - 1)) * 92 + 4}%` }}
        >
          <span className="text-t3">{labels[hover]}</span>{" "}
          <span className="font-bold text-pri">{data[hover]}{unit}</span>
          {threats && threats[hover] > 0 && <span className="font-bold text-threat"> · {threats[hover]} threat{threats[hover] > 1 ? "s" : ""}</span>}
        </div>
      )}
      <span className="sr-only">Chart maximum {niceMax}</span>
    </div>
  );
}

export function BarsChart({
  data,
  labels,
  color = "#22D3EE",
  height = 200,
}: { data: number[]; labels?: string[]; color?: string; height?: number }) {
  const W = 640;
  const H = 210;
  const mx = Math.max(...data, 1);
  const bw = (W - 20) / data.length;
  const [hover, setHover] = useState<number | null>(null);
  const step = labels ? Math.max(1, Math.ceil(labels.length / 10)) : 0;
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }} preserveAspectRatio="none" onMouseLeave={() => setHover(null)}>
        {[0.33, 0.66, 1].map((f) => (
          <line key={f} x1="8" x2={W - 8} y1={176 - f * 168} y2={176 - f * 168} stroke="#1B2536" strokeDasharray="3 5" />
        ))}
        <line x1="8" x2={W - 8} y1="176" y2="176" stroke="#202A3A" />
        {data.map((v, i) => {
          const bh = Math.max(2, (v / mx) * 160);
          return (
            <rect
              key={i}
              x={10 + i * bw + bw * 0.18}
              y={176 - bh}
              width={bw * 0.64}
              height={bh}
              rx="3"
              fill={hover === i ? "#67E8F9" : color}
              opacity={hover === null || hover === i ? (color === "#FF3B4D" ? 0.85 : 0.8) : 0.4}
              onMouseEnter={() => setHover(i)}
              className="transition-opacity duration-150"
            />
          );
        })}
      </svg>
      {labels && (
        <div className="flex justify-between px-1 font-mono text-[10px] text-t3">
          {labels.map((l, i) => (i % step === 0 ? <span key={i}>{l}</span> : null))}
        </div>
      )}
      {hover !== null && (
        <div
          className="pointer-events-none absolute -top-1 z-10 -translate-x-1/2 rounded-lg border border-line bg-raise px-2.5 py-1 font-mono text-[11px] font-bold text-pri shadow-xl"
          style={{ left: `${(hover / data.length) * 90 + 5}%` }}
        >
          {data[hover]}
        </div>
      )}
    </div>
  );
}

export function HBars({ items, color = "#22D3EE" }: { items: { label: string; v: number; color?: string }[]; color?: string }) {
  const mx = Math.max(...items.map((i) => i.v), 1);
  return (
    <div className="space-y-3.5">
      {items.map((it) => (
        <div key={it.label}>
          <div className="mb-1.5 flex items-center justify-between font-mono text-[11.5px]">
            <span className="text-t2">{it.label}</span>
            <span className="font-bold text-t1">{it.v}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[#1B2536]">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{ width: `${(it.v / mx) * 100}%`, background: it.color ?? color, boxShadow: `0 0 10px ${it.color ?? color}44` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function Donut({
  items,
  size = 168,
  centerLabel,
  centerSub,
}: { items: { label: string; v: number; color: string }[]; size?: number; centerLabel: string; centerSub: string }) {
  const total = items.reduce((a, b) => a + b.v, 0) || 1;
  const R = 42;
  const C = 2 * Math.PI * R;
  let acc = 0;
  return (
    <div className="flex items-center gap-6">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          <circle cx="50" cy="50" r={R} fill="none" stroke="#1B2536" strokeWidth="9" />
          {items.map((it) => {
            const frac = it.v / total;
            const el = (
              <circle
                key={it.label}
                cx="50" cy="50" r={R} fill="none"
                stroke={it.color} strokeWidth="9" strokeLinecap="butt"
                strokeDasharray={`${frac * C - 1.5} ${C - frac * C + 1.5}`}
                strokeDashoffset={-acc * C}
                className="transition-all duration-700"
              />
            );
            acc += frac;
            return el;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-[22px] font-bold leading-none text-t1">{centerLabel}</span>
          <span className="mt-1 font-mono text-[9.5px] tracking-[0.14em] text-t3">{centerSub}</span>
        </div>
      </div>
      <div className="min-w-0 flex-1 space-y-2.5">
        {items.map((it) => (
          <div key={it.label} className="flex items-center justify-between gap-3 text-[12.5px]">
            <span className="flex min-w-0 items-center gap-2 text-t2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: it.color }} />
              <span className="truncate">{it.label}</span>
            </span>
            <span className="font-mono font-bold text-t1">{it.v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
