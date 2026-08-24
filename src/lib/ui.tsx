import React, { useEffect, useRef, useState } from "react";
import { X, AlertTriangle, ChevronDown, ChevronLeft, ChevronRight, Inbox } from "lucide-react";
import type { Severity } from "./data";
import { SEV } from "./data";

export const cx = (...p: (string | false | null | undefined)[]) => p.filter(Boolean).join(" ");

/* ---------------- animated number ---------------- */

export function useTween(target: number, dur = 500) {
  const [v, setV] = useState(target);
  const cur = useRef(target);
  useEffect(() => {
    const from = cur.current;
    if (from === target) return;
    const t0 = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      cur.current = from + (target - from) * e;
      setV(cur.current);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, dur]);
  return v;
}

/* ---------------- buttons ---------------- */

type BtnVariant = "primary" | "secondary" | "danger" | "ghost" | "outline";
type BtnSize = "sm" | "md" | "lg";

const btnBase =
  "inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-all duration-150 select-none whitespace-nowrap disabled:opacity-45 disabled:pointer-events-none active:scale-[0.98]";
const btnVar: Record<BtnVariant, string> = {
  primary: "bg-pri text-[#061018] hover:bg-prisoft shadow-[0_0_18px_rgba(34,211,238,0.15)]",
  secondary: "bg-btnsec text-[#E2E8F0] hover:bg-btnhov border border-line",
  danger: "bg-threat text-white hover:bg-[#FF5C6C] shadow-[0_0_18px_rgba(255,59,77,0.18)]",
  ghost: "bg-transparent text-t2 hover:bg-white/5 hover:text-t1",
  outline: "bg-transparent text-t2 border border-[#334155] hover:border-pri hover:text-pri",
};
const btnSize: Record<BtnSize, string> = {
  sm: "h-8 px-3 text-[12.5px]",
  md: "h-10 px-4 text-[13.5px]",
  lg: "h-[46px] px-5 text-sm",
};

export function Button({
  variant = "secondary",
  size = "md",
  className,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: BtnSize }) {
  return (
    <button className={cx(btnBase, btnVar[variant], btnSize[size], className)} {...rest}>
      {children}
    </button>
  );
}

export function IconBtn({
  label,
  className,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      aria-label={label}
      title={label}
      className={cx(
        "inline-flex h-9 w-9 items-center justify-center rounded-lg text-t2 transition-colors duration-150 hover:bg-white/5 hover:text-t1",
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

/* ---------------- badges & dots ---------------- */

export function SevBadge({ sev, pulse }: { sev: Severity | "SAFE"; pulse?: boolean }) {
  const s = SEV[sev];
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 font-mono text-[11px] font-semibold tracking-wide",
        pulse && sev === "CRITICAL" && "anim-pulse-crit"
      )}
      style={{ color: s.color, background: s.bg, border: `1px solid ${s.color}33` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />
      {s.label}
    </span>
  );
}

export function Dot({ color, pulse, className }: { color: string; pulse?: boolean; className?: string }) {
  return (
    <span className={cx("inline-block h-2 w-2 shrink-0 rounded-full", pulse && "pulse-dot", className)} style={{ background: color, color }} />
  );
}

export function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[11px] font-semibold",
        ok ? "bg-safe/10 text-safe" : "bg-threat/10 text-threat"
      )}
    >
      <Dot color={ok ? "#20E3A2" : "#FF3B4D"} pulse={ok} />
      {label}
    </span>
  );
}

/* ---------------- surfaces ---------------- */

export function Card({
  className,
  children,
  hover,
}: { className?: string; children: React.ReactNode; hover?: boolean }) {
  return (
    <div
      className={cx(
        "rounded-xl border border-line bg-card shadow-[0_1px_0_rgba(255,255,255,0.02)_inset,0_8px_24px_rgba(0,0,0,0.18)]",
        hover && "transition-all duration-200 hover:-translate-y-0.5 hover:border-edge hover:shadow-[0_12px_32px_rgba(0,0,0,0.3)]",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHead({
  title,
  sub,
  right,
  icon,
}: { title: string; sub?: string; right?: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
      <div className="flex items-center gap-2.5">
        {icon && <span className="text-pri">{icon}</span>}
        <div>
          <h3 className="text-[13px] font-bold tracking-[0.08em] text-t1">{title}</h3>
          {sub && <p className="mt-0.5 text-[12px] text-t3">{sub}</p>}
        </div>
      </div>
      {right}
    </div>
  );
}

/* ---------------- form controls ---------------- */

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-semibold tracking-wide text-t2">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-[11.5px] leading-relaxed text-t3">{hint}</span>}
    </label>
  );
}

export const inputCls =
  "h-[42px] w-full rounded-lg border border-edge bg-ink px-3.5 text-[13.5px] text-t1 placeholder:text-t3 transition-all duration-150 focus:border-pri focus:shadow-[0_0_0_3px_rgba(34,211,238,0.08)] focus:outline-none";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(inputCls, props.className)} />;
}

export function Select({
  value,
  onChange,
  options,
  className,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <div className={cx("relative", className)}>
      <select
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cx(inputCls, "appearance-none pr-9 cursor-pointer")}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-card text-t1">
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-t3" />
    </div>
  );
}

export function Toggle({
  on,
  onChange,
  label,
  disabled,
}: { on: boolean; onChange: (v: boolean) => void; label?: string; disabled?: boolean }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={cx(
        "relative h-[22px] w-[40px] shrink-0 rounded-full transition-colors duration-200 disabled:opacity-40",
        on ? "bg-pri" : "bg-[#2A3648]"
      )}
    >
      <span
        className={cx(
          "absolute top-[3px] h-4 w-4 rounded-full bg-white shadow transition-all duration-200",
          on ? "left-[21px]" : "left-[3px]"
        )}
      />
    </button>
  );
}

export function Slider({
  value,
  min,
  max,
  step,
  onChange,
  format,
}: { value: number; min: number; max: number; step: number; onChange: (v: number) => void; format?: (v: number) => string }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="flex items-center gap-4">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={format ? format(value) : String(value)}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ "--track": `linear-gradient(90deg,#22D3EE ${pct}%,#202A3A ${pct}%)` } as React.CSSProperties}
      />
      <span className="w-14 shrink-0 rounded-md border border-line bg-ink px-2 py-1 text-center font-mono text-[12.5px] font-semibold text-pri">
        {format ? format(value) : value}
      </span>
    </div>
  );
}

/* ---------------- progress ---------------- */

export function Bar({ pct, color, className }: { pct: number; color: string; className?: string }) {
  return (
    <div className={cx("h-1.5 w-full overflow-hidden rounded-full bg-[#1B2536]", className)}>
      <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${Math.min(100, pct)}%`, background: color }} />
    </div>
  );
}

/* ---------------- modal ---------------- */

export function Modal({
  open,
  onClose,
  children,
  width = "max-w-lg",
  locked,
}: { open: boolean; onClose: () => void; children: React.ReactNode; width?: string; locked?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape" && !locked) onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose, locked]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="anim-fade absolute inset-0 bg-black/72 backdrop-blur-[7px]" onClick={() => !locked && onClose()} />
      <div
        role="dialog"
        aria-modal="true"
        className={cx("anim-pop relative w-full overflow-hidden rounded-[14px] border border-line bg-card shadow-[0_24px_80px_rgba(0,0,0,0.55)]", width)}
      >
        {children}
      </div>
    </div>
  );
}

export function ModalHead({ title, sub, onClose, tone }: { title: string; sub?: string; onClose: () => void; tone?: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-4" style={tone ? { borderColor: `${tone}44` } : undefined}>
      <div>
        <h3 className="font-mono text-[15px] font-bold tracking-wide text-t1">{title}</h3>
        {sub && <p className="mt-0.5 text-[12.5px] text-t3">{sub}</p>}
      </div>
      <IconBtn label="Close dialog" onClick={onClose} className="-mr-2 -mt-1">
        <X size={17} />
      </IconBtn>
    </div>
  );
}

export function ConfirmModal({
  open,
  title,
  body,
  confirmLabel = "DELETE",
  onCancel,
  onConfirm,
}: { open: boolean; title: string; body: string; confirmLabel?: string; onCancel: () => void; onConfirm: () => void }) {
  return (
    <Modal open={open} onClose={onCancel} width="max-w-md">
      <div className="p-6">
        <div className="flex items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-threat/12 text-threat">
            <AlertTriangle size={20} />
          </span>
          <div>
            <h3 className="text-[15px] font-bold text-t1">{title}</h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-t2">{body}</p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2.5">
          <Button variant="secondary" onClick={onCancel}>CANCEL</Button>
          <Button variant="danger" onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </Modal>
  );
}

/* ---------------- tabs ---------------- */

export function Tabs({
  tabs,
  active,
  onChange,
  size = "md",
}: { tabs: string[]; active: string; onChange: (t: string) => void; size?: "sm" | "md" }) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-line bg-ink p-1">
      {tabs.map((t) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className={cx(
            "rounded-md font-mono font-semibold tracking-wide transition-all duration-150",
            size === "sm" ? "px-2.5 py-1 text-[11px]" : "px-3.5 py-1.5 text-[12px]",
            active === t ? "bg-raise text-pri shadow-[0_0_12px_rgba(34,211,238,0.08)]" : "text-t3 hover:text-t2"
          )}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

/* ---------------- skeleton / empty ---------------- */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("skeleton", className)} />;
}

export function EmptyState({
  icon,
  title,
  sub,
  action,
}: { icon?: React.ReactNode; title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-line bg-raise text-safe">
        {icon ?? <Inbox size={22} />}
      </span>
      <p className="text-[14.5px] font-semibold text-t1">{title}</p>
      {sub && <p className="mt-1.5 max-w-xs text-[12.5px] leading-relaxed text-t3">{sub}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* ---------------- dropdown menu ---------------- */

export interface MenuItem { label: string; icon?: React.ReactNode; danger?: boolean; onClick: () => void }

export function Dropdown({
  button,
  items,
  align = "right",
  width = "w-48",
}: { button: React.ReactNode; items: MenuItem[]; align?: "left" | "right"; width?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", h);
    window.addEventListener("keydown", k);
    return () => { document.removeEventListener("mousedown", h); window.removeEventListener("keydown", k); };
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <span onClick={() => setOpen((o) => !o)}>{button}</span>
      {open && (
        <div
          className={cx(
            "anim-pop absolute z-50 mt-1.5 overflow-hidden rounded-lg border border-line bg-raise py-1 shadow-[0_16px_48px_rgba(0,0,0,0.5)]",
            width,
            align === "right" ? "right-0" : "left-0"
          )}
        >
          {items.map((it, i) => (
            <button
              key={i}
              onClick={() => { setOpen(false); it.onClick(); }}
              className={cx(
                "flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[12.5px] font-medium transition-colors duration-100",
                it.danger ? "text-threat hover:bg-threat/10" : "text-t2 hover:bg-white/5 hover:text-t1"
              )}
            >
              {it.icon}
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- avatar & pagination ---------------- */

export function Avatar({ name, size = 34, tone = "#22D3EE" }: { name: string; size?: number; tone?: string }) {
  const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full font-mono font-bold"
      style={{
        width: size, height: size, fontSize: size * 0.34,
        color: tone, background: `${tone}1a`, border: `1px solid ${tone}44`,
      }}
    >
      {initials}
    </span>
  );
}

export function Pagination({
  page,
  pages,
  onPage,
  total,
  shown,
}: { page: number; pages: number; onPage: (p: number) => void; total: number; shown: number }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
      <p className="font-mono text-[11.5px] text-t3">
        SHOWING <span className="text-t2">{shown}</span> OF <span className="text-t2">{total}</span> EVENTS
      </p>
      <div className="flex items-center gap-1.5">
        <IconBtn label="Previous page" onClick={() => onPage(Math.max(1, page - 1))} className="h-8 w-8 border border-line">
          <ChevronLeft size={15} />
        </IconBtn>
        {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
          <button
            key={p}
            onClick={() => onPage(p)}
            className={cx(
              "h-8 min-w-8 rounded-lg border px-2 font-mono text-[12px] font-semibold transition-colors duration-150",
              p === page ? "border-pri/50 bg-pri/10 text-pri" : "border-line text-t3 hover:border-edge hover:text-t2"
            )}
          >
            {p}
          </button>
        ))}
        <IconBtn label="Next page" onClick={() => onPage(Math.min(pages, page + 1))} className="h-8 w-8 border border-line">
          <ChevronRight size={15} />
        </IconBtn>
      </div>
    </div>
  );
}
