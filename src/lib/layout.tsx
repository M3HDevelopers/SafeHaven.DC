import React, { useEffect, useRef, useState } from "react";
import {
  LayoutDashboard, Radar, ScrollText, Camera as CameraIcon, Layers, BarChart3, SlidersHorizontal,
  BellRing, Server, Users, Bell, Keyboard, X, CheckCircle2, XCircle, Info, AlertTriangle,
  WifiOff, RefreshCw, Download, ChevronDown, LogOut, User as UserIcon, Menu, Home,
  Video, Loader2, ShieldCheck, Maximize2,
} from "lucide-react";
import { useStore, PAGE_META, type Route } from "./store";
import { fmtClock, fmtStamp, fmtTime, timeAgo, SEV, TYPE_COLOR, fmtDateTime, type Page, type WeaponType } from "./data";
import { Button, IconBtn, Dot, SevBadge, cx, Avatar, Dropdown } from "./ui";

/* ---------------- logo ---------------- */

export function Logo({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" aria-hidden>
      <path d="M18 3l12 4.4V17c0 8.3-5.1 14.1-12 16.5C11.1 31.1 6 25.3 6 17V7.4L18 3z" stroke="#22D3EE" strokeWidth="2" fill="rgba(34,211,238,0.06)" strokeLinejoin="round" />
      <circle cx="18" cy="15.5" r="3.2" stroke="#22D3EE" strokeWidth="1.7" />
      <circle cx="18" cy="15.5" r="1.1" fill="#22D3EE" />
      <path d="M18 18.9v5.8M14.8 13.5l-4.1-2.5M21.2 13.5l4.1-2.5" stroke="#22D3EE" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

/* ---------------- sidebar ---------------- */

const NAV: { label: string; items: { page: Page; tab?: string; label: string; icon: React.ReactNode }[] }[] = [
  {
    label: "MONITORING",
    items: [
      { page: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={17} /> },
      { page: "live", label: "Live Detection", icon: <Radar size={17} /> },
      { page: "logs", label: "Threat Logs", icon: <ScrollText size={17} /> },
    ],
  },
  {
    label: "MANAGEMENT",
    items: [
      { page: "cameras", label: "Cameras", icon: <CameraIcon size={17} /> },
      { page: "models", label: "Detection Models", icon: <Layers size={17} /> },
      { page: "analytics", label: "Analytics", icon: <BarChart3 size={17} /> },
    ],
  },
  {
    label: "CONFIGURATION",
    items: [
      { page: "settings", tab: "detection", label: "Detection Settings", icon: <SlidersHorizontal size={17} /> },
      { page: "settings", tab: "alerts", label: "Alert Settings", icon: <BellRing size={17} /> },
      { page: "settings", tab: "system", label: "System Settings", icon: <Server size={17} /> },
    ],
  },
  {
    label: "ADMIN",
    items: [{ page: "users", label: "Users", icon: <Users size={17} /> }],
  },
];

function SidebarInner() {
  const s = useStore();
  const online = s.cameras.filter((c) => c.status === "online").length;
  const model = s.models.find((mm) => mm.id === s.activeModelId);
  const userName = localStorage.getItem("sh_user") || "Admin User";

  const isActive = (it: { page: Page; tab?: string }) =>
    s.route.page === it.page && (it.page !== "settings" || (s.route.tab ?? "detection") === (it.tab ?? "detection"));

  return (
    <div className="flex h-full w-[248px] flex-col bg-side">
      <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-line px-5">
        <Logo size={33} />
        <div className="leading-tight">
          <p className="text-[15.5px] font-extrabold tracking-tight text-t1">SafeHaven</p>
          <p className="font-mono text-[8.5px] font-semibold tracking-[0.22em] text-t3">AI SECURITY PLATFORM</p>
        </div>
      </div>

      <nav className="thin-scroll flex-1 overflow-y-auto px-3 py-4">
        {NAV.map((sec) => (
          <div key={sec.label} className="mb-5">
            <p className="mb-1.5 px-3 font-mono text-[9.5px] font-semibold tracking-[0.18em] text-t3">{sec.label}</p>
            <div className="space-y-0.5">
              {sec.items.map((it) => {
                const active = isActive(it);
                return (
                  <button
                    key={it.label}
                    onClick={() => s.navigate(it.page, it.tab ? { tab: it.tab } : undefined)}
                    className={cx(
                      "flex h-10 w-full items-center gap-3 rounded-md border-l-[3px] px-3 text-[13px] font-medium transition-all duration-150",
                      active
                        ? "border-pri bg-pri/8 text-t1"
                        : "border-transparent text-t2 hover:bg-white/4 hover:text-t1"
                    )}
                  >
                    <span className={cx("transition-colors duration-150", active ? "text-pri" : "text-t3")}>{it.icon}</span>
                    {it.label}
                    {it.page === "logs" && s.incidents.some((i) => i.status === "New") && (
                      <span className="ml-auto rounded-full bg-threat/15 px-1.5 py-0.5 font-mono text-[10px] font-bold text-threat">
                        {s.incidents.filter((i) => i.status === "New").length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="mx-3 mb-3 rounded-xl border border-line bg-card p-3.5">
        <div className="mb-2.5 flex items-center justify-between">
          <span className="font-mono text-[9.5px] font-semibold tracking-[0.16em] text-t3">SYSTEM STATUS</span>
          <Dot color="#20E3A2" pulse />
        </div>
        <div className="space-y-2 text-[11.5px]">
          <p className="flex items-center gap-2 text-safe"><CheckCircle2 size={12} /> <span className="font-semibold">OPERATIONAL</span></p>
          <div className="flex justify-between gap-2 text-t2">
            <span className="text-t3">Model</span>
            <span className="truncate font-mono text-[10.5px] text-t2">{model?.name} {model?.version}</span>
          </div>
          <div className="flex justify-between text-t2">
            <span className="text-t3">Cameras</span>
            <span className="font-mono text-[10.5px]">{online} online</span>
          </div>
          <div>
            <div className="mb-1 flex justify-between text-t2">
              <span className="text-t3">GPU</span>
              <span className="font-mono text-[10.5px]">{s.metrics.gpu}%</span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-[#1B2536]">
              <div className="h-full rounded-full bg-pri transition-all duration-700" style={{ width: `${s.metrics.gpu}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-line p-3">
        <Dropdown
          align="left"
          width="w-44"
          button={
            <button className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors duration-150 hover:bg-white/4">
              <Avatar name={userName} size={32} />
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block truncate text-[12.5px] font-semibold text-t1">{userName}</span>
                <span className="block font-mono text-[9.5px] tracking-wider text-t3">ADMINISTRATOR</span>
              </span>
              <ChevronDown size={14} className="text-t3" />
            </button>
          }
          items={[
            { label: "Profile", icon: <UserIcon size={14} />, onClick: () => s.navigate("profile") },
            { label: "Sign out", icon: <LogOut size={14} />, danger: true, onClick: () => s.logout() },
          ]}
        />
      </div>
    </div>
  );
}

/* ---------------- header ---------------- */

function Header({ onShortcuts }: { onShortcuts: () => void }) {
  const s = useStore();
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!bellOpen) return;
    const h = (e: MouseEvent) => { if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [bellOpen]);

  const meta =
    s.route.page === "settings" && s.route.tab === "alerts"
      ? { title: "Alert Settings", sub: "Notification channels and escalation" }
      : s.route.page === "settings" && s.route.tab === "system"
        ? { title: "System Settings", sub: "Platform health and services" }
        : PAGE_META[s.route.page];

  const newCount = s.incidents.filter((i) => i.status === "New").length;
  const badge = s.alerts.length + newCount;
  const recent = s.incidents.slice(0, 5);

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-line bg-[rgba(8,12,20,0.88)] px-4 backdrop-blur-md md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <IconBtn label="Open navigation" className="lg:hidden border border-line" onClick={() => s.setDrawer(true)}>
          <Menu size={17} />
        </IconBtn>
        <div className="min-w-0">
          <h1 className="truncate text-[16.5px] font-bold leading-tight text-t1">{meta.title}</h1>
          <p className="truncate text-[11.5px] text-t3">{meta.sub}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        <span className="hidden items-center gap-2 rounded-full border border-safe/25 bg-safe/8 px-3 py-1.5 font-mono text-[11px] font-semibold text-safe md:inline-flex">
          <Dot color="#20E3A2" pulse /> Operational
        </span>
        <span className="hidden font-mono text-[12.5px] tabular-nums text-t2 sm:block">{fmtClock(s.now)}</span>

        <IconBtn label="Keyboard shortcuts" onClick={onShortcuts} className="border border-line">
          <Keyboard size={16} />
        </IconBtn>

        <div ref={bellRef} className="relative">
          <IconBtn label="Notifications" className="border border-line" onClick={() => setBellOpen((o) => !o)}>
            <Bell size={16} />
          </IconBtn>
          {badge > 0 && (
            <span className="pointer-events-none absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-crit px-1 font-mono text-[9.5px] font-bold text-white">
              {badge}
            </span>
          )}
          {bellOpen && (
            <div className="anim-pop absolute right-0 z-50 mt-2 w-[320px] overflow-hidden rounded-xl border border-line bg-raise shadow-[0_20px_60px_rgba(0,0,0,0.55)]">
              <div className="flex items-center justify-between border-b border-line px-4 py-3">
                <span className="text-[12px] font-bold tracking-wide text-t1">NOTIFICATIONS</span>
                <span className="font-mono text-[10.5px] text-t3">{badge} unread</span>
              </div>
              <div className="max-h-72 overflow-y-auto thin-scroll">
                {recent.map((i) => (
                  <button
                    key={i.id}
                    onClick={() => { setBellOpen(false); s.setOpenIncidentId(i.id); }}
                    className="flex w-full items-center gap-3 border-b border-line/60 px-4 py-2.5 text-left transition-colors duration-100 hover:bg-white/4"
                  >
                    <Dot color={SEV[i.severity].color} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12px] font-semibold text-t1">{i.type} · {i.confidence.toFixed(1)}%</span>
                      <span className="block font-mono text-[10px] text-t3">{i.cameraId} · {timeAgo(i.time, s.now)}</span>
                    </span>
                    {i.status === "New" && <span className="rounded bg-pri/12 px-1.5 py-0.5 font-mono text-[9px] font-bold text-pri">NEW</span>}
                  </button>
                ))}
              </div>
              <button
                onClick={() => { setBellOpen(false); s.navigate("logs"); }}
                className="w-full px-4 py-2.5 text-center font-mono text-[10.5px] font-semibold tracking-wider text-pri transition-colors hover:bg-white/4"
              >
                VIEW ALL LOGS
              </button>
            </div>
          )}
        </div>

        <button onClick={() => s.navigate("profile")} className="ml-1 flex items-center gap-2 rounded-full transition-transform duration-150 hover:scale-[1.04]">
          <Avatar name={localStorage.getItem("sh_user") || "Admin User"} size={32} />
        </button>
      </div>
    </header>
  );
}

/* ---------------- emergency alert bar ---------------- */

function AlertBar() {
  const s = useStore();
  if (!s.criticalActive) return null;
  const latest = s.incidents.find((i) => i.severity === "CRITICAL");
  return (
    <div className="anim-pulse-soft flex h-[42px] shrink-0 items-center gap-4 border-b border-[rgba(255,23,68,0.4)] bg-[rgba(255,23,68,0.10)] px-4 md:px-6">
      <span className="flex items-center gap-2.5">
        <Dot color="#FF1744" pulse />
        <span className="font-mono text-[11.5px] font-bold tracking-[0.12em] text-crit">CRITICAL THREAT DETECTED</span>
      </span>
      <span className="hidden min-w-0 flex-1 truncate text-[12.5px] text-t2 md:block">
        {latest ? `${latest.type.toLowerCase()} detected on ${latest.cameraName}` : "Potential weapon detected on Camera 02"}
      </span>
      <Button variant="danger" size="sm" className="ml-auto md:ml-0" onClick={() => latest && s.setOpenIncidentId(latest.id)}>
        VIEW INCIDENT
      </Button>
    </div>
  );
}

/* ---------------- toast & threat alert hosts ---------------- */

const TOAST_META = {
  success: { color: "#20E3A2", icon: <CheckCircle2 size={17} /> },
  info: { color: "#38BDF8", icon: <Info size={17} /> },
  warning: { color: "#FF9F1C", icon: <AlertTriangle size={17} /> },
  error: { color: "#FF3B4D", icon: <XCircle size={17} /> },
};

export function ToastHost() {
  const s = useStore();
  return (
    <div className="pointer-events-none fixed right-4 top-[74px] z-[95] w-[340px] max-w-[calc(100vw-2rem)] space-y-2">
      {s.toasts.map((t) => {
        const m = TOAST_META[t.kind];
        return (
          <div
            key={t.id}
            role="status"
            className="anim-toast pointer-events-auto flex items-start gap-3 rounded-xl border bg-raise/95 p-3.5 shadow-[0_14px_44px_rgba(0,0,0,0.5)] backdrop-blur"
            style={{ borderColor: `${m.color}44` }}
          >
            <span style={{ color: m.color }}>{m.icon}</span>
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] font-bold text-t1">{t.title}</p>
              {t.msg && <p className="mt-0.5 text-[11.5px] leading-snug text-t3">{t.msg}</p>}
            </div>
            <button aria-label="Dismiss notification" onClick={() => s.dismissToast(t.id)} className="text-t3 transition-colors hover:text-t1">
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

const THREAT_SENTENCE: Record<WeaponType, string> = {
  "Potential Weapon": "Potential weapon detected.",
  Knife: "Knife detected in frame.",
  "Other Threat": "Suspicious object detected.",
};

export function ThreatAlertHost() {
  const s = useStore();
  return (
    <div className="fixed bottom-20 right-4 z-[85] w-[380px] max-w-[calc(100vw-2rem)] space-y-3 lg:bottom-6">
      {s.alerts.map((a) => {
        const inc = s.incidents.find((i) => i.id === a.incidentId);
        if (!inc) return null;
        const crit = inc.severity === "CRITICAL";
        return (
          <div
            key={a.id}
            role="alert"
            className="anim-alert overflow-hidden rounded-xl border bg-raise/97 shadow-[0_0_34px_rgba(255,23,68,0.14),0_18px_50px_rgba(0,0,0,0.5)] backdrop-blur"
            style={{ borderColor: crit ? "rgba(255,23,68,0.75)" : "rgba(255,59,77,0.5)" }}
          >
            <div className="flex items-center gap-2.5 border-b px-4 py-2.5" style={{ borderColor: "rgba(255,59,77,0.25)" }}>
              <span className={cx("text-crit", crit && "anim-iconpulse")}><AlertTriangle size={15} /></span>
              <span className="font-mono text-[11px] font-bold tracking-[0.14em] text-threat">THREAT DETECTED</span>
              <span className="ml-auto"><SevBadge sev={inc.severity} pulse /></span>
            </div>
            <div className="flex gap-3 p-4">
              <img src={inc.img} alt={`${inc.cameraId} frame`} className="h-[52px] w-[84px] shrink-0 rounded-md border border-line object-cover" />
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] font-semibold text-t1">{THREAT_SENTENCE[inc.type]}</p>
                <div className="mt-1.5 space-y-0.5 font-mono text-[10.5px] text-t3">
                  <p>CAMERA <span className="text-t2">{inc.cameraId}</span></p>
                  <p>CONFIDENCE <span className="font-bold" style={{ color: SEV[inc.severity].color }}>{inc.confidence.toFixed(1)}%</span></p>
                  <p>TIME <span className="text-t2">{fmtTime(inc.time)}</span></p>
                </div>
              </div>
            </div>
            <div className="flex gap-2 px-4 pb-4">
              <Button variant="danger" size="sm" className="flex-1" onClick={() => { s.setOpenIncidentId(inc.id); s.dismissAlert(a.id); }}>
                VIEW INCIDENT
              </Button>
              <Button variant="ghost" size="sm" onClick={() => s.dismissAlert(a.id)}>DISMISS</Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- video viewport ---------------- */

export function VideoViewport({ cameraId, tall }: { cameraId?: string; tall?: boolean }) {
  const s = useStore();
  const cam = s.cameras.find((c) => c.id === (cameraId ?? s.activeCamId)) ?? s.cameras[0];
  const [loaded, setLoaded] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const effKey = cam?.id;

  useEffect(() => { setLoaded(false); }, [effKey]);
  if (!cam) return null;

  const at = s.activeThreat && s.activeThreat.cameraId === cam.id ? s.activeThreat : null;
  const boxColor = at ? TYPE_COLOR[at.inc.type] : "#22D3EE";
  const shortLabel = at ? (at.inc.type === "Potential Weapon" ? "WEAPON" : at.inc.type === "Knife" ? "KNIFE" : "THREAT") : "";
  const offline = cam.status === "offline";

  return (
    <div className={cx("scanlines relative w-full overflow-hidden rounded-lg border border-line bg-[#05080D]", tall ? "aspect-video" : "aspect-video")}>
      {!offline && (
        <img
          key={cam.id}
          src={cam.img}
          alt={`Live feed from ${cam.name}`}
          onLoad={() => setLoaded(true)}
          className={cx("h-full w-full object-cover transition-opacity duration-700", loaded ? "opacity-90" : "opacity-0")}
          style={{ filter: "saturate(0.72) contrast(1.06) brightness(0.94)" }}
        />
      )}

      {/* loading */}
      {!offline && !loaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <Loader2 size={22} className="animate-spin text-pri" />
          <p className="font-mono text-[11.5px] tracking-wider text-t3">Connecting to camera…</p>
        </div>
      )}

      {/* offline error state */}
      {offline && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#0B0F17] px-6 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-threat/40 bg-threat/10 text-threat">
            <WifiOff size={20} />
          </span>
          <div>
            <p className="text-[14px] font-bold text-t1">Camera connection lost</p>
            <p className="mt-1 font-mono text-[11px] text-t3">LAST HEARTBEAT {timeAgo(s.now - cam.lastHeartbeat * 1000, s.now).toUpperCase()} · {cam.endpoint}</p>
          </div>
          <Button
            variant="secondary" size="sm"
            onClick={() => { setRetrying(true); s.retryCamera(cam.id); setTimeout(() => setRetrying(false), 1800); }}
          >
            <RefreshCw size={13} className={retrying ? "animate-spin" : ""} />
            {retrying ? "RECONNECTING…" : "RETRY CONNECTION"}
          </Button>
        </div>
      )}

      {/* overlays */}
      {!offline && loaded && (
        <>
          {/* corner brackets */}
          {["left-2 top-2 border-l-2 border-t-2", "right-2 top-2 border-r-2 border-t-2", "left-2 bottom-2 border-l-2 border-b-2", "right-2 bottom-2 border-r-2 border-b-2"].map((c) => (
            <span key={c} className={cx("pointer-events-none absolute h-5 w-5 border-pri/60", c)} />
          ))}

          <div className="pointer-events-none absolute left-4 top-3.5 flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded bg-black/55 px-2 py-1 font-mono text-[10px] font-bold tracking-widest text-threat backdrop-blur-sm">
              <span className="anim-blink h-1.5 w-1.5 rounded-full bg-threat" /> LIVE
            </span>
            <span className="rounded bg-black/55 px-2 py-1 font-mono text-[10px] tracking-wider text-t1 backdrop-blur-sm">
              {cam.name.toUpperCase()} · {cam.location.toUpperCase()}
            </span>
          </div>

          <div className="pointer-events-none absolute right-4 top-3.5 flex items-center gap-2">
            {s.recording && (
              <span className="flex items-center gap-1.5 rounded bg-black/55 px-2 py-1 font-mono text-[10px] font-bold tracking-widest text-threat backdrop-blur-sm">
                <span className="anim-blink h-1.5 w-1.5 rounded-full bg-threat" /> REC
              </span>
            )}
            <span className="rounded bg-black/55 px-2 py-1 font-mono text-[10px] font-semibold text-pri backdrop-blur-sm">
              FPS {s.metrics.fps.toFixed(1)}
            </span>
          </div>

          <div className="pointer-events-none absolute bottom-3 left-4 rounded bg-black/55 px-2 py-1 font-mono text-[9.5px] tracking-wider text-t2 backdrop-blur-sm">
            AI MODEL: WEAPON-DETECTOR-V2
          </div>
          <div className="pointer-events-none absolute bottom-3 right-4 rounded bg-black/55 px-2 py-1 font-mono text-[9.5px] tabular-nums tracking-wider text-t2 backdrop-blur-sm">
            {fmtStamp(s.now)}
          </div>

          {/* scanning sweep */}
          {s.running && (
            <div className="pointer-events-none absolute inset-x-0 h-14" style={{ animation: "kf-scan 5.5s linear infinite" }}>
              <div className="h-full w-full bg-gradient-to-b from-transparent via-pri/6 to-transparent" />
              <div className="h-px w-full bg-pri/20" />
            </div>
          )}

          {/* detection bounding box */}
          {s.running && at && s.settings.boxes && (
            <div
              className="anim-boxin pointer-events-none absolute"
              style={{
                left: `${at.box.x}%`, top: `${at.box.y}%`, width: `${at.box.w}%`, height: `${at.box.h}%`,
                transition: "left 2.2s linear, top 2.2s linear, width 2.2s linear, height 2.2s linear",
              }}
            >
              <div className="relative h-full w-full rounded-[3px] border-[1.5px]" style={{ borderColor: boxColor, boxShadow: `0 0 18px ${boxColor}33, inset 0 0 14px ${boxColor}14` }}>
                {s.settings.labels && (
                  <span
                    className="absolute -top-[22px] left-[-1.5px] flex items-center gap-1.5 rounded-sm px-1.5 py-0.5 font-mono text-[9.5px] font-bold tracking-wider text-[#080C14]"
                    style={{ background: boxColor }}
                  >
                    {shortLabel} {at.inc.confidence.toFixed(1)}%
                  </span>
                )}
                <span className="absolute -left-px -top-px h-2.5 w-2.5 border-l-2 border-t-2" style={{ borderColor: boxColor }} />
                <span className="absolute -right-px -top-px h-2.5 w-2.5 border-r-2 border-t-2" style={{ borderColor: boxColor }} />
                <span className="absolute -bottom-px -left-px h-2.5 w-2.5 border-b-2 border-l-2" style={{ borderColor: boxColor }} />
                <span className="absolute -bottom-px -right-px h-2.5 w-2.5 border-b-2 border-r-2" style={{ borderColor: boxColor }} />
              </div>
            </div>
          )}

          {/* paused overlay */}
          {!s.running && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#05080D]/72 backdrop-blur-[2px]">
              <Video size={22} className="text-t3" />
              <p className="font-mono text-[12px] font-semibold tracking-[0.14em] text-t2">DETECTION PAUSED</p>
              <p className="text-[11.5px] text-t3">Live feed only — press START DETECTION to resume AI analysis.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ---------------- threat level chip ---------------- */

export function ThreatLevelChip() {
  const s = useStore();
  const m = SEV[s.threatLevel];
  return (
    <span
      className={cx(
        "inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 font-mono text-[11px] font-bold tracking-[0.12em]",
        s.threatLevel === "CRITICAL" && "anim-pulse-crit"
      )}
      style={{ color: m.color, background: m.bg, borderColor: `${m.color}44` }}
      title={`Current threat level: ${m.label}`}
    >
      <Dot color={m.color} pulse={s.threatLevel !== "SAFE"} />
      THREAT LEVEL: {m.label}
    </span>
  );
}

/* ---------------- incident modal ---------------- */

export function IncidentModal() {
  const s = useStore();
  const inc = s.incidents.find((i) => i.id === s.openIncidentId);

  useEffect(() => {
    if (!inc) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") s.setOpenIncidentId(null); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [inc, s]);

  if (!inc) return null;
  const sev = SEV[inc.severity];

  const download = () => {
    fetch(inc.img).then((r) => r.blob()).then((b) => {
      const url = URL.createObjectURL(b);
      const a = document.createElement("a");
      a.href = url;
      a.download = `safehaven_${inc.id}_snapshot.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      s.toast("success", "Snapshot downloaded", `${inc.id} frame saved with detection metadata.`);
    }).catch(() => {
      window.open(inc.img, "_blank", "noopener");
      s.toast("info", "Snapshot opened", `${inc.id} frame opened full-size in a new tab.`);
    });
  };

  const rows: [string, React.ReactNode][] = [
    ["DETECTION TYPE", <span key="t" className="font-semibold text-t1">{inc.type}</span>],
    ["CONFIDENCE", <span key="c" className="font-mono font-bold" style={{ color: sev.color }}>{inc.confidence.toFixed(1)}%</span>],
    ["CAMERA", <span key="cam" className="text-t1">{inc.cameraName}</span>],
    ["CAMERA ID", <span key="id" className="font-mono text-pri">{inc.cameraId}</span>],
    ["TIMESTAMP", <span key="ts" className="font-mono text-t2">{fmtDateTime(inc.time)}</span>],
    ["SEVERITY", <SevBadge key="s" sev={inc.severity} pulse />],
    ["AI MODEL", <span key="m" className="font-mono text-t2">{inc.model}</span>],
    ["STATUS", <span key="st" className={cx("font-mono text-[12px] font-semibold", inc.status === "New" ? "text-warn" : "text-safe")}>{inc.status.toUpperCase()}</span>],
  ];

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="anim-fade absolute inset-0 bg-black/72 backdrop-blur-[8px]" onClick={() => s.setOpenIncidentId(null)} />
      <div className="anim-pop relative max-h-[92vh] w-full max-w-2xl overflow-y-auto thin-scroll rounded-[14px] border bg-card shadow-[0_28px_90px_rgba(0,0,0,0.6)]" style={{ borderColor: `${sev.color}44` }}>
        <div className="flex items-center justify-between gap-3 border-b border-line px-6 py-4">
          <div className="flex items-center gap-3">
            <h3 className="font-mono text-[15px] font-bold tracking-wide text-t1">INCIDENT #{inc.id}</h3>
            <SevBadge sev={inc.severity} pulse />
          </div>
          <IconBtn label="Close incident" onClick={() => s.setOpenIncidentId(null)}><X size={17} /></IconBtn>
        </div>

        <div className="p-6">
          <div className="scanlines relative overflow-hidden rounded-lg border border-line bg-[#05080D]">
            <img src={inc.img} alt={`Evidence frame for ${inc.id}`} className="aspect-video w-full object-cover opacity-90" style={{ filter: "saturate(0.72) contrast(1.05)" }} />
            <div className="absolute" style={{ left: `${inc.box.x}%`, top: `${inc.box.y}%`, width: `${inc.box.w}%`, height: `${inc.box.h}%` }}>
              <div className="relative h-full w-full rounded-[3px] border-[1.5px]" style={{ borderColor: TYPE_COLOR[inc.type] }}>
                <span className="absolute -top-[22px] left-0 rounded-sm px-1.5 py-0.5 font-mono text-[9.5px] font-bold tracking-wider text-[#080C14]" style={{ background: TYPE_COLOR[inc.type] }}>
                  {inc.type === "Potential Weapon" ? "WEAPON" : inc.type === "Knife" ? "KNIFE" : "THREAT"} {inc.confidence.toFixed(1)}%
                </span>
              </div>
            </div>
            <span className="absolute left-3 top-3 rounded bg-black/55 px-2 py-1 font-mono text-[9.5px] tracking-wider text-t2">{inc.cameraId} · {fmtStamp(inc.time)}</span>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-x-6 gap-y-3.5 sm:grid-cols-2">
            {rows.map(([k, v]) => (
              <div key={k} className="flex items-center justify-between gap-3 border-b border-line/60 pb-2.5">
                <span className="font-mono text-[10px] font-semibold tracking-[0.14em] text-t3">{k}</span>
                <span className="text-right text-[12.5px]">{v}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap justify-end gap-2.5">
            <Button variant="ghost" onClick={() => s.setOpenIncidentId(null)}>CLOSE</Button>
            <Button variant="secondary" onClick={download}><Download size={14} /> DOWNLOAD SNAPSHOT</Button>
            {inc.status !== "Reviewed" ? (
              <Button variant="primary" onClick={() => s.reviewIncident(inc.id)}><CheckCircle2 size={14} /> MARK AS REVIEWED</Button>
            ) : (
              <Button variant="outline" disabled><ShieldCheck size={14} /> REVIEWED</Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- shortcuts modal ---------------- */

const SHORTCUTS: [string, string][] = [
  ["Space", "Start / stop detection"],
  ["S", "Capture snapshot"],
  ["R", "Toggle recording"],
  ["F", "Fullscreen viewport"],
  ["L", "Open Threat Logs"],
  ["Esc", "Close dialogs"],
  ["?", "Shortcut help"],
];

export function ShortcutsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="anim-fade absolute inset-0 bg-black/72 backdrop-blur-[6px]" onClick={onClose} />
      <div className="anim-pop relative w-full max-w-sm rounded-[14px] border border-line bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h3 className="flex items-center gap-2 text-[13.5px] font-bold text-t1"><Keyboard size={16} className="text-pri" /> Keyboard Shortcuts</h3>
          <IconBtn label="Close shortcuts" onClick={onClose}><X size={16} /></IconBtn>
        </div>
        <div className="space-y-1 p-4">
          {SHORTCUTS.map(([k, d]) => (
            <div key={k} className="flex items-center justify-between rounded-lg px-2 py-2 transition-colors hover:bg-white/3">
              <span className="text-[12.5px] text-t2">{d}</span>
              <kbd className="rounded-md border border-line bg-ink px-2 py-1 font-mono text-[11px] font-semibold text-pri">{k}</kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------- fullscreen overlay ---------------- */

function FullscreenOverlay() {
  const s = useStore();
  if (!s.fullscreen) return null;
  const cam = s.cameras.find((c) => c.id === s.activeCamId);
  return (
    <div className="anim-fade fixed inset-0 z-[80] flex flex-col bg-[#04070C]">
      <div className="flex h-14 items-center justify-between border-b border-line px-5">
        <span className="flex items-center gap-3">
          <Maximize2 size={15} className="text-pri" />
          <span className="font-mono text-[12px] font-semibold tracking-wider text-t1">{cam?.id} — {cam?.location.toUpperCase()}</span>
        </span>
        <div className="flex items-center gap-2">
          <ThreatLevelChip />
          <IconBtn label="Exit fullscreen" onClick={() => s.setFullscreen(false)}><X size={18} /></IconBtn>
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-6xl"><VideoViewport /></div>
      </div>
    </div>
  );
}

/* ---------------- footer + mobile nav ---------------- */

function Footer() {
  const s = useStore();
  const link = (label: string) => (
    <button onClick={() => s.toast("info", `${label}`, "Opens in the SafeHaven ops portal.")} className="transition-colors duration-150 hover:text-t2">
      {label}
    </button>
  );
  return (
    <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-4 text-[11.5px] text-t3 md:px-6">
      <span>© 2026 SafeHaven AI Security</span>
      <span className="flex items-center gap-2 font-mono text-[10.5px] tracking-wider">
        <Dot color="#20E3A2" pulse /> SYSTEM STATUS · OPERATIONAL
      </span>
      <span className="flex items-center gap-4">
        <span className="font-mono text-[10.5px]">v1.0.0</span>
        {link("Privacy")} {link("Terms")} {link("Support")}
      </span>
    </footer>
  );
}

function MobileNav() {
  const s = useStore();
  const items: { page: Page; label: string; icon: React.ReactNode }[] = [
    { page: "dashboard", label: "Home", icon: <Home size={19} /> },
    { page: "live", label: "Live", icon: <Radar size={19} /> },
    { page: "logs", label: "Threats", icon: <ScrollText size={19} /> },
    { page: "cameras", label: "Cameras", icon: <CameraIcon size={19} /> },
  ];
  const hasNew = s.incidents.some((i) => i.status === "New");
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid h-16 grid-cols-5 border-t border-line bg-side/95 backdrop-blur lg:hidden">
      {items.map((it) => {
        const active = s.route.page === it.page;
        return (
          <button key={it.page} onClick={() => s.navigate(it.page)} className={cx("relative flex flex-col items-center justify-center gap-1 transition-colors duration-150", active ? "text-pri" : "text-t3")}>
            {it.icon}
            <span className="text-[9.5px] font-semibold">{it.label}</span>
            {it.page === "logs" && hasNew && <span className="absolute right-[26%] top-2 h-1.5 w-1.5 rounded-full bg-crit" />}
          </button>
        );
      })}
      <button onClick={() => s.setDrawer(true)} className="flex flex-col items-center justify-center gap-1 text-t3 transition-colors duration-150 hover:text-t1">
        <Menu size={19} />
        <span className="text-[9.5px] font-semibold">More</span>
      </button>
    </nav>
  );
}

/* ---------------- app shell ---------------- */

export function AppShell({ children }: { children: React.ReactNode }) {
  const s = useStore();
  const [shortcuts, setShortcuts] = useState(false);
  const fullRef = useRef(s.fullscreen);
  fullRef.current = s.fullscreen;

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable)) return;
      if (e.key === "Escape" && fullRef.current) { s.setFullscreen(false); return; }
      switch (e.key) {
        case " ": e.preventDefault(); s.running ? s.stopDetection() : s.startDetection(); break;
        case "s": case "S": s.snapshot(); break;
        case "r": case "R": s.toggleRecord(); break;
        case "l": case "L": s.navigate("logs"); break;
        case "f": case "F": s.setFullscreen(!fullRef.current); break;
        case "?": setShortcuts(true); break;
        default: break;
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [s]);

  return (
    <div className="min-h-screen bg-abyss">
      <div className="fixed inset-y-0 left-0 z-40 hidden lg:block"><SidebarInner /></div>

      {s.drawer && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="anim-fade absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => s.setDrawer(false)} />
          <div className="anim-fadeup absolute inset-y-0 left-0 shadow-2xl"><SidebarInner /></div>
        </div>
      )}

      <div className="flex min-h-screen flex-col lg:pl-[248px]">
        <Header onShortcuts={() => setShortcuts(true)} />
        <AlertBar />
        <main className="mx-auto w-full max-w-[1720px] flex-1 px-4 pb-24 pt-6 md:px-6 lg:pb-6">
          <div key={`${s.route.page}-${s.route.tab ?? ""}`} className="anim-fadeup">{children}</div>
        </main>
        <div className="hidden lg:block"><Footer /></div>
      </div>

      <MobileNav />
      <ToastHost />
      <ThreatAlertHost />
      <IncidentModal />
      <ShortcutsModal open={shortcuts} onClose={() => setShortcuts(false)} />
      <FullscreenOverlay />
    </div>
  );
}
