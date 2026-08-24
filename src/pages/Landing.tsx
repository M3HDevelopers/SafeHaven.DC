import React from "react";
import { Radar, BellRing, BarChart3, Server, ArrowRight, Layers, Zap, ScanLine, CheckCircle2 } from "lucide-react";
import { FEEDS } from "../lib/data";
import { Button, Dot } from "../lib/ui";
import { Logo } from "../lib/layout";
import { AreaChart } from "../lib/charts";
import { DET_24, THR_24, pad2 } from "../lib/data";

function Nav({ onEnter }: { onEnter: () => void }) {
  return (
    <nav className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-line/70 bg-[rgba(8,12,20,0.85)] px-5 backdrop-blur-md md:px-10">
      <span className="flex items-center gap-2.5">
        <Logo size={30} />
        <span className="text-[15px] font-extrabold tracking-tight text-t1">SafeHaven</span>
      </span>
      <div className="flex items-center gap-2.5">
        <Button variant="ghost" size="sm" onClick={onEnter}>SIGN IN</Button>
        <Button variant="primary" size="sm" onClick={onEnter}>OPEN DASHBOARD <ArrowRight size={13} /></Button>
      </div>
    </nav>
  );
}

function PreviewMock() {
  return (
    <div className="anim-float relative">
      <div className="absolute -inset-6 rounded-3xl bg-[radial-gradient(closest-side,rgba(34,211,238,0.10),transparent)]" />
      <div className="relative overflow-hidden rounded-xl border border-line bg-card shadow-[0_30px_90px_rgba(0,0,0,0.55)]">
        <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
          <span className="flex items-center gap-2 font-mono text-[10px] font-bold tracking-widest">
            <span className="flex items-center gap-1.5 rounded bg-black/40 px-1.5 py-0.5 text-threat"><span className="anim-blink h-1.5 w-1.5 rounded-full bg-threat" />LIVE</span>
            <span className="text-t2">CAM-02 · LOBBY</span>
          </span>
          <span className="font-mono text-[10px] font-semibold text-pri">FPS 29.7</span>
        </div>
        <div className="scanlines relative">
          <img src={FEEDS.lobby} alt="Live surveillance preview" className="aspect-video w-full object-cover opacity-90" style={{ filter: "saturate(0.72) contrast(1.06)" }} />
          <div className="absolute" style={{ left: "38%", top: "30%", width: "19%", height: "38%" }}>
            <div className="relative h-full w-full rounded-[3px] border-[1.5px] border-threat shadow-[0_0_20px_rgba(255,59,77,0.25)]">
              <span className="absolute -top-[21px] left-0 rounded-sm bg-threat px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-wider text-[#080C14]">WEAPON 94.7%</span>
            </div>
          </div>
          <span className="absolute bottom-2.5 left-3 rounded bg-black/55 px-2 py-1 font-mono text-[9px] tracking-wider text-t2">AI MODEL: WEAPON-DETECTOR-V2</span>
          <span className="absolute right-3 top-2.5 rounded bg-black/55 px-2 py-1 font-mono text-[9.5px] font-bold tracking-widest text-threat">
            <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-threat" />HIGH
          </span>
        </div>
        <div className="grid grid-cols-3 divide-x divide-line border-t border-line font-mono text-[10px]">
          {[["CONFIDENCE", "94.7%", "#FF3B4D"], ["LATENCY", "34ms", "#22D3EE"], ["GPU", "72%", "#38BDF8"]].map(([k, v, c]) => (
            <div key={k as string} className="px-3 py-2.5">
              <p className="tracking-[0.14em] text-t3">{k}</p>
              <p className="mt-0.5 text-[13px] font-bold" style={{ color: c as string }}>{v}</p>
            </div>
          ))}
        </div>
      </div>

      {/* floating side chips */}
      <div className="absolute -left-8 top-16 hidden rounded-lg border border-line bg-raise px-3 py-2 shadow-xl md:block">
        <p className="font-mono text-[9px] tracking-widest text-t3">ALERT BUS</p>
        <p className="mt-0.5 flex items-center gap-1.5 text-[11px] font-semibold text-safe"><Dot color="#20E3A2" pulse /> SMS · Email · SOC</p>
      </div>
      <div className="absolute -bottom-5 -right-4 hidden rounded-lg border border-line bg-raise px-3 py-2 shadow-xl md:block">
        <p className="font-mono text-[9px] tracking-widest text-t3">INFERENCE</p>
        <p className="mt-0.5 text-[11px] font-semibold text-pri">29.7 FPS · FP16</p>
      </div>
    </div>
  );
}

export default function Landing({ onEnter }: { onEnter: () => void }) {
  const labels = Array.from({ length: 24 }, (_, i) => `${pad2(i)}:00`);
  return (
    <div className="min-h-screen bg-abyss text-t1">
      <Nav onEnter={onEnter} />

      {/* HERO */}
      <header className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-gridlines opacity-60 [mask-image:radial-gradient(ellipse_80%_70%_at_50%_30%,black,transparent)]" />
        <div className="pointer-events-none absolute right-[-180px] top-[-160px] h-[640px] w-[640px] rounded-full bg-[radial-gradient(closest-side,rgba(34,211,238,0.08),transparent)]" />
        <div className="relative mx-auto grid max-w-[1240px] items-center gap-14 px-5 pb-20 pt-16 md:px-10 lg:grid-cols-[1.05fr_1fr] lg:pt-24">
          <div className="anim-fadeup">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-line bg-card px-3.5 py-1.5 font-mono text-[10.5px] font-semibold tracking-[0.18em] text-pri">
              <Radar size={12} /> AI SECURITY OPERATIONS · v1.0
            </p>
            <h1 className="text-[42px] font-extrabold leading-[1.04] tracking-tight md:text-[58px]">
              Smarter Detection.<br />
              <span className="text-pri">Safer Spaces.</span>
            </h1>
            <p className="mt-6 max-w-[520px] text-[15.5px] leading-relaxed text-t2">
              Real-time AI-powered threat detection designed for modern security operations.
              SafeHaven watches every camera, classifies potential weapons in milliseconds,
              and escalates incidents before they escalate themselves.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3.5">
              <Button variant="primary" size="lg" onClick={onEnter}>OPEN SECURITY DASHBOARD <ArrowRight size={15} /></Button>
              <Button variant="outline" size="lg" onClick={() => document.getElementById("architecture")?.scrollIntoView({ behavior: "smooth" })}>VIEW SYSTEM</Button>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 font-mono text-[11px] tracking-wider text-t3">
              <span><span className="font-bold text-t1">92.8%</span> MODEL ACCURACY</span>
              <span><span className="font-bold text-t1">&lt;35ms</span> INFERENCE LATENCY</span>
              <span><span className="font-bold text-t1">24/7</span> AUTONOMOUS MONITORING</span>
            </div>
          </div>
          <PreviewMock />
        </div>
      </header>

      {/* trust strip */}
      <div className="border-y border-line bg-pane/60">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-center gap-x-10 gap-y-2 px-5 py-4 font-mono text-[10.5px] font-semibold tracking-[0.18em] text-t3 md:justify-between md:px-10">
          {["ON-PREMISE INFERENCE", "RTSP · ONVIF · USB", "SOC2-ALIGNED PIPELINE", "EDGE + CLOUD HYBRID", "EVIDENCE-GRADE ARCHIVAL"].map((t) => (
            <span key={t} className="flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-pri/60" />{t}</span>
          ))}
        </div>
      </div>

      {/* REAL-TIME DETECTION */}
      <section className="mx-auto max-w-[1240px] px-5 py-20 md:px-10">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="font-mono text-[10.5px] font-bold tracking-[0.2em] text-pri">01 — REAL-TIME AI DETECTION</p>
            <h2 className="mt-3 text-[30px] font-extrabold leading-tight tracking-tight md:text-[36px]">Every frame analyzed.<br />Every threat boxed.</h2>
            <p className="mt-4 max-w-[480px] text-[14.5px] leading-relaxed text-t2">
              Weapon Detector v2 runs continuous inference on every connected stream, drawing
              smoothed bounding boxes around potential firearms, knives and suspicious objects —
              with calibrated confidence scoring and alert cooldowns to prevent noise.
            </p>
            <ul className="mt-6 space-y-3">
              {["Firearm, knife and blunt-object classes", "Confidence threshold tuning 0.10 – 0.90", "Interpolated tracking — no flicker, no false strobes"].map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-[13.5px] text-t2"><CheckCircle2 size={15} className="shrink-0 text-safe" />{f}</li>
              ))}
            </ul>
          </div>
          <div className="relative overflow-hidden rounded-xl border border-line bg-card">
            <img src={FEEDS.entrance} alt="Detection bounding box demo" className="aspect-video w-full object-cover opacity-90" style={{ filter: "saturate(0.72)" }} />
            <div className="absolute" style={{ left: "52%", top: "34%", width: "16%", height: "34%" }}>
              <div className="h-full w-full rounded-[3px] border-[1.5px] border-warn shadow-[0_0_18px_rgba(255,159,28,0.25)]" />
              <span className="absolute -top-[21px] left-0 rounded-sm bg-warn px-1.5 py-0.5 font-mono text-[9px] font-bold text-[#080C14]">KNIFE 88.2%</span>
            </div>
            <div className="absolute inset-x-0 bottom-0 border-t border-line bg-[rgba(8,12,20,0.88)] px-4 py-3 backdrop-blur">
              <div className="flex items-center justify-between font-mono text-[10px] tracking-wider text-t3">
                <span>CONFIDENCE TRACE</span><span className="text-warn">88.2% STABLE</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#1B2536]">
                <div className="h-full w-[88%] rounded-full bg-warn" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MULTI-CAMERA */}
      <section className="border-y border-line bg-pane/50">
        <div className="mx-auto grid max-w-[1240px] items-center gap-12 px-5 py-20 md:px-10 lg:grid-cols-[1fr_1.15fr]">
          <div className="order-2 lg:order-1 grid grid-cols-2 gap-3.5">
            {[
              { img: FEEDS.entrance, id: "CAM-01", loc: "MAIN ENTRANCE", st: "ONLINE" },
              { img: FEEDS.lobby, id: "CAM-02", loc: "LOBBY", st: "ONLINE" },
              { img: FEEDS.parking, id: "CAM-03", loc: "PARKING B1", st: "ONLINE" },
              { img: FEEDS.corridor, id: "CAM-04", loc: "EAST CORRIDOR", st: "ONLINE" },
            ].map((c) => (
              <div key={c.id} className="group overflow-hidden rounded-lg border border-line bg-card transition-all duration-200 hover:-translate-y-1 hover:border-pri/40">
                <div className="relative">
                  <img src={c.img} alt={`${c.id} feed`} className="aspect-video w-full object-cover opacity-85 transition-opacity duration-200 group-hover:opacity-100" style={{ filter: "saturate(0.7)" }} />
                  <span className="absolute left-2 top-2 flex items-center gap-1.5 rounded bg-black/55 px-1.5 py-0.5 font-mono text-[8.5px] font-bold text-safe"><Dot color="#20E3A2" pulse />{c.st}</span>
                </div>
                <div className="flex items-center justify-between px-3 py-2 font-mono text-[9.5px] tracking-wider">
                  <span className="text-t2">{c.id} · {c.loc}</span><span className="text-pri">29 FPS</span>
                </div>
              </div>
            ))}
          </div>
          <div className="order-1 lg:order-2">
            <p className="font-mono text-[10.5px] font-bold tracking-[0.2em] text-pri">02 — MULTI-CAMERA MONITORING</p>
            <h2 className="mt-3 text-[30px] font-extrabold leading-tight tracking-tight md:text-[36px]">One operations wall.<br />Every angle covered.</h2>
            <p className="mt-4 max-w-[480px] text-[14.5px] leading-relaxed text-t2">
              Register IP cameras, RTSP streams, USB webcams or video files. SafeHaven keeps
              heartbeats, per-camera FPS and detection counts in one calm, prioritized view —
              and reconnects dropped sources automatically.
            </p>
            <div className="mt-7 flex gap-8 font-mono text-[11px] tracking-wider text-t3">
              <span><span className="block text-[22px] font-bold text-t1">10</span>SOURCES</span>
              <span><span className="block text-[22px] font-bold text-safe">8</span>ONLINE</span>
              <span><span className="block text-[22px] font-bold text-t1">29.7</span>AVG FPS</span>
            </div>
          </div>
        </div>
      </section>

      {/* ANALYTICS + ALERTS */}
      <section className="mx-auto max-w-[1240px] px-5 py-20 md:px-10">
        <div className="grid gap-12 lg:grid-cols-[1.15fr_1fr]">
          <div>
            <p className="font-mono text-[10.5px] font-bold tracking-[0.2em] text-pri">03 — THREAT INTELLIGENCE</p>
            <h2 className="mt-3 text-[30px] font-extrabold leading-tight tracking-tight md:text-[36px]">Patterns, not just alarms.</h2>
            <p className="mt-4 max-w-[520px] text-[14.5px] leading-relaxed text-t2">
              Hourly threat activity, camera comparison, confidence distributions and detection
              frequency — analytics that help security teams understand where risk actually
              concentrates, and prove it in the Monday report.
            </p>
            <div className="mt-8 rounded-xl border border-line bg-card p-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="font-mono text-[10.5px] font-bold tracking-[0.16em] text-t2">DETECTION FREQUENCY — 24H</span>
                <span className="flex items-center gap-4 font-mono text-[9.5px] text-t3">
                  <span className="flex items-center gap-1.5"><span className="h-1.5 w-3 rounded bg-pri" />DETECTIONS</span>
                  <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-threat" />THREATS</span>
                </span>
              </div>
              <AreaChart data={DET_24} threats={THR_24} labels={labels} height={180} />
            </div>
          </div>
          <div className="flex flex-col justify-center gap-4">
            {[
              { icon: <BellRing size={17} />, t: "Alert automation", d: "Sound, SMS, email and browser channels with per-severity escalation and cooldown logic.", c: "#FF3B4D" },
              { icon: <BarChart3 size={17} />, t: "Exportable evidence", d: "CSV and PDF exports, timestamped snapshots and full incident timelines for every event.", c: "#22D3EE" },
              { icon: <Zap size={17} />, t: "Operator-first response", d: "One-keystroke shortcuts, incident review queue and dismissal flows built for 3 AM shifts.", c: "#FF9F1C" },
            ].map((f) => (
              <div key={f.t} className="flex gap-4 rounded-xl border border-line bg-card p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-edge">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" style={{ color: f.c, background: `${f.c}14`, border: `1px solid ${f.c}33` }}>{f.icon}</span>
                <div>
                  <p className="text-[14px] font-bold text-t1">{f.t}</p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-t3">{f.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ARCHITECTURE */}
      <section id="architecture" className="border-t border-line bg-pane/50">
        <div className="mx-auto max-w-[1240px] px-5 py-20 md:px-10">
          <p className="font-mono text-[10.5px] font-bold tracking-[0.2em] text-pri">04 — TECHNICAL ARCHITECTURE</p>
          <h2 className="mt-3 max-w-[560px] text-[30px] font-extrabold leading-tight tracking-tight md:text-[36px]">A pipeline engineered for calm.</h2>
          <div className="mt-10 grid gap-3 md:grid-cols-[1fr_auto_1fr_auto_1.2fr_auto_1fr] md:items-stretch">
            {[
              { icon: <ScanLine size={16} />, t: "SOURCES", d: "CCTV · RTSP · ONVIF · USB · files" },
              null,
              { icon: <Layers size={16} />, t: "INGEST", d: "Frame queue · 30 FPS · dewarp" },
              null,
              { icon: <Radar size={16} />, t: "WEAPON-DETECTOR-V2", d: "GPU inference · FP16 · 34ms", hot: true },
              null,
              { icon: <Server size={16} />, t: "ALERT BUS", d: "SMS · Email · SOC · evidence vault" },
            ].map((b, i) =>
              b === null ? (
                <div key={i} className="hidden items-center justify-center font-mono text-[16px] text-pri md:flex">→</div>
              ) : (
                <div
                  key={i}
                  className={`rounded-xl border p-4 transition-all duration-200 hover:-translate-y-0.5 ${b.hot ? "border-pri/50 bg-pri/6 shadow-[0_0_30px_rgba(34,211,238,0.08)]" : "border-line bg-card"}`}
                >
                  <span className={b.hot ? "text-pri" : "text-t2"}>{b.icon}</span>
                  <p className="mt-2.5 font-mono text-[11px] font-bold tracking-wider text-t1">{b.t}</p>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-t3">{b.d}</p>
                </div>
              )
            )}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="mx-auto max-w-[1240px] px-5 py-20 md:px-10">
        <div className="relative overflow-hidden rounded-2xl border border-line bg-card px-8 py-12 text-center md:py-16">
          <div className="pointer-events-none absolute inset-0 bg-gridlines-faint opacity-70" />
          <div className="pointer-events-none absolute left-1/2 top-[-160px] h-[320px] w-[620px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(34,211,238,0.10),transparent)]" />
          <h2 className="relative text-[28px] font-extrabold tracking-tight md:text-[36px]">Your control room is ready.</h2>
          <p className="relative mx-auto mt-3 max-w-[460px] text-[14px] leading-relaxed text-t2">
            Sign in to the live demo environment — cameras are streaming, the model is loaded,
            and a detection event will land within seconds.
          </p>
          <div className="relative mt-7">
            <Button variant="primary" size="lg" onClick={onEnter}>OPEN SECURITY DASHBOARD <ArrowRight size={15} /></Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-3 px-5 py-6 font-mono text-[10.5px] tracking-wider text-t3 md:px-10">
          <span>© 2026 SAFEHAVEN AI SECURITY</span>
          <span className="flex items-center gap-2"><Dot color="#20E3A2" pulse /> ALL SYSTEMS OPERATIONAL</span>
          <span>v1.0.0</span>
        </div>
      </footer>
    </div>
  );
}
