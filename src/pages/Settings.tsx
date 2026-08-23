import React, { useState } from "react";
import {
  Volume2, MessageSquare, Mail, Globe, Server, Save, Activity, RefreshCw, Loader2, Send, Database, HardDrive, Cpu, Gauge,
} from "lucide-react";
import { useStore } from "../lib/store";
import { Card, CardHead, Button, Tabs, Toggle, Slider, Field, Input, Select, Modal, ModalHead, Dot, cx } from "../lib/ui";
import type { Settings as S } from "../lib/store";

function ToggleRow({
  title, desc, on, onChange,
}: { title: string; desc: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-6 border-b border-line/70 py-4 last:border-0">
      <div>
        <p className="text-[13.5px] font-semibold text-t1">{title}</p>
        <p className="mt-0.5 text-[12px] leading-relaxed text-t3">{desc}</p>
      </div>
      <Toggle on={on} onChange={onChange} label={title} />
    </div>
  );
}

/* ---------- ALERTS tab modals ---------- */

function SmsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const s = useStore();
  const [f, setF] = useState(s.settings.smsCfg ?? { sid: "", token: "", from: "", to: "" });
  const [testing, setTesting] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <Modal open={open} onClose={onClose} width="max-w-md">
      <ModalHead title="SMS CONFIGURATION" sub="Twilio-compatible gateway credentials" onClose={onClose} />
      <div className="space-y-4 p-6">
        <Field label="Account SID"><Input value={f.sid} onChange={set("sid")} placeholder="ACxxxxxxxxxxxxxxxx" className="font-mono text-[12px]" /></Field>
        <Field label="Auth Token"><Input type="password" value={f.token} onChange={set("token")} placeholder="••••••••••••••••" autoComplete="off" /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Sender Number"><Input value={f.from} onChange={set("from")} placeholder="+1 555 0100" className="font-mono text-[12px]" /></Field>
          <Field label="Recipient Numbers"><Input value={f.to} onChange={set("to")} placeholder="+1 555 0142, +1 555 0177" className="font-mono text-[12px]" /></Field>
        </div>
        <p className="rounded-lg border border-line bg-ink px-3.5 py-2.5 text-[11px] leading-relaxed text-t3">
          Credentials are encrypted at rest and never echoed back to the UI.
        </p>
      </div>
      <div className="flex justify-end gap-2.5 border-t border-line px-6 py-4">
        <Button variant="outline" disabled={testing} onClick={() => { setTesting(true); setTimeout(() => { setTesting(false); s.toast("info", "Test SMS sent", `Delivered to ${f.to || "recipients"} in 1.2s.`); }, 1100); }}>
          {testing ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Test SMS
        </Button>
        <Button variant="primary" onClick={() => { s.saveSettings({ smsCfg: f, sms: true }); onClose(); }}><Save size={13} /> Save Configuration</Button>
      </div>
    </Modal>
  );
}

function EmailModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const s = useStore();
  const [f, setF] = useState(s.settings.emailCfg ?? { host: "", port: "587", user: "", pass: "", to: "", enc: "TLS" as "TLS" | "SSL" });
  const [testing, setTesting] = useState(false);
  const set = (k: "host" | "port" | "user" | "pass" | "to") => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <Modal open={open} onClose={onClose} width="max-w-md">
      <ModalHead title="EMAIL CONFIGURATION" sub="SMTP relay for incident digests" onClose={onClose} />
      <div className="space-y-4 p-6">
        <div className="grid grid-cols-[1fr_110px] gap-4">
          <Field label="SMTP Host"><Input value={f.host} onChange={set("host")} placeholder="smtp.safehaven.ai" className="font-mono text-[12px]" /></Field>
          <Field label="Port"><Input value={f.port} onChange={set("port")} className="font-mono text-[12px]" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Username"><Input value={f.user} onChange={set("user")} placeholder="alerts@safehaven.ai" /></Field>
          <Field label="Password"><Input type="password" value={f.pass} onChange={set("pass")} placeholder="••••••••" autoComplete="new-password" /></Field>
        </div>
        <Field label="Recipient Emails"><Input value={f.to} onChange={set("to")} placeholder="soc@company.com, guard@company.com" /></Field>
        <Field label="Encryption">
          <Select value={f.enc} onChange={(v) => setF({ ...f, enc: v as "TLS" | "SSL" })} options={[{ value: "TLS", label: "TLS (recommended)" }, { value: "SSL", label: "SSL" }]} />
        </Field>
      </div>
      <div className="flex justify-end gap-2.5 border-t border-line px-6 py-4">
        <Button variant="outline" disabled={testing} onClick={() => { setTesting(true); setTimeout(() => { setTesting(false); s.toast("info", "Test email sent", `Relayed via ${f.host || "SMTP"} · accepted by gateway.`); }, 1100); }}>
          {testing ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Test Email
        </Button>
        <Button variant="primary" onClick={() => { s.saveSettings({ emailCfg: f, email: true }); onClose(); }}><Save size={13} /> Save Configuration</Button>
      </div>
    </Modal>
  );
}

function SoundModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const s = useStore();
  const [vol, setVol] = useState(0.6);
  return (
    <Modal open={open} onClose={onClose} width="max-w-sm">
      <ModalHead title="SOUND ALERTS" sub="Audible cue on threat detection" onClose={onClose} />
      <div className="space-y-4 p-6">
        <Field label="Alert Volume" hint="Two-tone cue, 880 → 622 Hz, never continuous.">
          <Slider value={vol} min={0} max={1} step={0.05} onChange={setVol} format={(v) => `${Math.round(v * 100)}%`} />
        </Field>
      </div>
      <div className="flex justify-end gap-2.5 border-t border-line px-6 py-4">
        <Button variant="outline" onClick={() => s.spawnThreat()}><Volume2 size={13} /> Preview Cue</Button>
        <Button variant="primary" onClick={() => { s.saveSettings({ sound: true }); onClose(); }}>Save</Button>
      </div>
    </Modal>
  );
}

/* ---------- tabs ---------- */

function DetectionTab() {
  const s = useStore();
  const t = (patch: Partial<S>) => s.saveSettings(patch, true);
  return (
    <Card className="p-6">
      <ToggleRow title="Weapon Detection" desc="Primary pipeline — firearm, knife and blunt-object classes." on={s.settings.weapon} onChange={(v) => t({ weapon: v })} />
      <ToggleRow title="Person Detection" desc="Tracks persons for context, count and loitering analysis." on={s.settings.person} onChange={(v) => t({ person: v })} />
      <ToggleRow title="Future Threat Detection" desc="Behavioral pre-threat indicators (beta research model)." on={s.settings.future} onChange={(v) => t({ future: v })} />
      <ToggleRow title="Motion Detection" desc="Fallback motion heuristics when the GPU queue saturates." on={s.settings.motion} onChange={(v) => t({ motion: v })} />
      <ToggleRow title="Enable Bounding Boxes" desc="Draw detection boxes on live viewports and snapshots." on={s.settings.boxes} onChange={(v) => t({ boxes: v })} />
      <ToggleRow title="Enable Confidence Labels" desc="Show class + confidence tags above each bounding box." on={s.settings.labels} onChange={(v) => t({ labels: v })} />
    </Card>
  );
}

function ThresholdsTab() {
  const s = useStore();
  const [conf, setConf] = useState(s.settings.conf);
  const [iou, setIou] = useState(s.settings.iou);
  const [cool, setCool] = useState(s.settings.cooldown);
  return (
    <Card className="p-6">
      <div className="max-w-2xl space-y-8">
        <div>
          <p className="text-[13.5px] font-semibold text-t1">Confidence Threshold</p>
          <div className="mt-3"><Slider value={conf} min={0.1} max={0.9} step={0.01} onChange={setConf} format={(v) => v.toFixed(2)} /></div>
          <p className="mt-2 text-[11.5px] leading-relaxed text-t3">Detections below this confidence are discarded before alerting. Lower values catch more events but raise false positives — 0.45 is the calibrated default.</p>
        </div>
        <div>
          <p className="text-[13.5px] font-semibold text-t1">IOU Threshold</p>
          <div className="mt-3"><Slider value={iou} min={0.1} max={0.9} step={0.01} onChange={setIou} format={(v) => v.toFixed(2)} /></div>
          <p className="mt-2 text-[11.5px] leading-relaxed text-t3">Overlap tolerance when merging duplicate boxes on the same object. Higher values keep near-duplicate detections separate.</p>
        </div>
        <div>
          <p className="text-[13.5px] font-semibold text-t1">Alert Cooldown</p>
          <div className="mt-3"><Slider value={cool} min={5} max={300} step={5} onChange={setCool} format={(v) => `${v}s`} /></div>
          <p className="mt-2 text-[11.5px] leading-relaxed text-t3">Minimum quiet period between repeated alerts for the same camera zone, preventing notification storms during sustained events.</p>
        </div>
        <div className="flex justify-end border-t border-line pt-5">
          <Button variant="primary" onClick={() => s.saveSettings({ conf, iou, cooldown: cool })}><Save size={14} /> Save Settings</Button>
        </div>
      </div>
    </Card>
  );
}

function AlertsTab() {
  const s = useStore();
  const [smsOpen, setSmsOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [soundOpen, setSoundOpen] = useState(false);

  const channels = [
    { icon: <Volume2 size={17} />, c: "#22D3EE", title: "Sound Alerts", desc: "Audible two-tone cue in the operations room on any confirmed threat.", on: s.settings.sound, onToggle: (v: boolean) => s.saveSettings({ sound: v }, true), onCfg: () => setSoundOpen(true), cfg: "Configure" },
    { icon: <MessageSquare size={17} />, c: "#20E3A2", title: "SMS Alerts", desc: "Text message escalation to on-duty operators via gateway.", on: s.settings.sms, onToggle: (v: boolean) => s.saveSettings({ sms: v }, true), onCfg: () => setSmsOpen(true), cfg: s.settings.smsCfg ? "Reconfigure" : "Configure" },
    { icon: <Mail size={17} />, c: "#38BDF8", title: "Email Alerts", desc: "Incident digest with snapshot attachment to the SOC mailbox.", on: s.settings.email, onToggle: (v: boolean) => s.saveSettings({ email: v }, true), onCfg: () => setEmailOpen(true), cfg: s.settings.emailCfg ? "Reconfigure" : "Configure" },
    { icon: <Globe size={17} />, c: "#FF9F1C", title: "Browser Notifications", desc: "Native desktop notifications for operators on this console.", on: s.settings.browser, onToggle: (v: boolean) => s.saveSettings({ browser: v }, true), onCfg: () => s.toast("info", "Test notification sent", "Check your browser notification center."), cfg: "Send Test" },
  ];

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      {channels.map((ch) => (
        <Card key={ch.title} className="p-5">
          <div className="flex items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ color: ch.c, background: `${ch.c}12`, border: `1px solid ${ch.c}2e` }}>{ch.icon}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[14px] font-bold text-t1">{ch.title}</p>
                <Toggle on={ch.on} onChange={ch.onToggle} label={ch.title} />
              </div>
              <p className="mt-1 text-[12px] leading-relaxed text-t3">{ch.desc}</p>
              <div className="mt-3.5 flex items-center gap-3">
                <Button variant="secondary" size="sm" onClick={ch.onCfg}>{ch.cfg}</Button>
                <span className={cx("font-mono text-[10px] font-bold tracking-wider", ch.on ? "text-safe" : "text-t3")}>
                  {ch.on ? "ENABLED" : "DISABLED"}
                </span>
              </div>
            </div>
          </div>
        </Card>
      ))}
      {smsOpen && <SmsModal open onClose={() => setSmsOpen(false)} />}
      {emailOpen && <EmailModal open onClose={() => setEmailOpen(false)} />}
      {soundOpen && <SoundModal open onClose={() => setSoundOpen(false)} />}
    </div>
  );
}

function ModelTab() {
  const s = useStore();
  const [device, setDevice] = useState(s.settings.device);
  const [precision, setPrecision] = useState(s.settings.precision);
  const [modelId, setModelId] = useState(s.activeModelId);
  return (
    <Card className="p-6">
      <div className="max-w-2xl space-y-5">
        <Field label="Active Inference Model" hint="Switching models hot-swaps weights without dropping camera streams.">
          <Select value={modelId} onChange={setModelId} options={s.models.map((m) => ({ value: m.id, label: `${m.name} ${m.version} · ${m.accuracy ? m.accuracy.toFixed(1) + "% acc" : "uncalibrated"}` }))} />
        </Field>
        <div className="grid grid-cols-2 gap-5">
          <Field label="Inference Device">
            <Select value={device} onChange={(v) => setDevice(v as "GPU" | "CPU")} options={[{ value: "GPU", label: "GPU — NVIDIA RTX 4090" }, { value: "CPU", label: "CPU — fallback only" }]} />
          </Field>
          <Field label="Precision">
            <Select value={precision} onChange={(v) => setPrecision(v as "FP16" | "FP32")} options={[{ value: "FP16", label: "FP16 — fastest" }, { value: "FP32", label: "FP32 — maximum accuracy" }]} />
          </Field>
        </div>
        <ToggleRow title="Automatic Model Updates" desc="Pull validated weight updates from the SafeHaven registry at 03:00." on={s.settings.autoupdate} onChange={(v) => s.saveSettings({ autoupdate: v }, true)} />
        <div className="flex justify-end border-t border-line pt-5">
          <Button variant="primary" onClick={() => { s.saveSettings({ device, precision }); if (modelId !== s.activeModelId) s.activateModel(modelId); }}>
            <Save size={14} /> Apply Configuration
          </Button>
        </div>
      </div>
    </Card>
  );
}

function SystemTab() {
  const s = useStore();
  const [checking, setChecking] = useState(false);
  const rows: [React.ReactNode, string, string, string][] = [
    [<Activity key="1" size={15} />, "AI Engine Status", "Running · Weapon Detector v2", "#20E3A2"],
    [<Database key="2" size={15} />, "Database Status", "PostgreSQL 16 · healthy · 12ms", "#20E3A2"],
    [<Gauge key="3" size={15} />, "GPU Status", `NVIDIA RTX 4090 · ${s.metrics.gpu}% load · 61°C`, "#20E3A2"],
    [<Cpu key="4" size={15} />, "CPU Status", `Xeon E-2388G · ${s.metrics.cpu}% load`, "#20E3A2"],
    [<HardDrive key="5" size={15} />, "Storage", "4.1 / 32 GB evidence vault used", "#20E3A2"],
    [<Server key="6" size={15} />, "Model Directory", "/opt/safehaven/models", "#38BDF8"],
    [<Server key="7" size={15} />, "Server Port", "8443 · TLS 1.3", "#38BDF8"],
    [<Globe key="8" size={15} />, "API Status", "v1 · 200 OK · 99.98% uptime", "#20E3A2"],
  ];
  return (
    <div className="space-y-5">
      <Card>
        <CardHead title="PLATFORM HEALTH" sub="All core subsystems report operational" right={
          <Button variant="primary" size="sm" disabled={checking} onClick={() => { setChecking(true); setTimeout(() => { setChecking(false); s.toast("success", "Health check passed", "All 9 subsystems healthy · average probe 38ms."); }, 1300); }}>
            {checking ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} {checking ? "CHECKING…" : "RUN HEALTH CHECK"}
          </Button>
        } />
        <div className="divide-y divide-line/70 px-6">
          {rows.map(([icon, k, v, c]) => (
            <div key={k} className="flex items-center justify-between gap-4 py-3.5">
              <span className="flex items-center gap-3 text-[13px] font-semibold text-t2"><span style={{ color: c }}>{icon}</span>{k}</span>
              <span className="flex items-center gap-2.5 font-mono text-[11px] text-t2">
                {v} <Dot color={c === "#20E3A2" ? "#20E3A2" : "#38BDF8"} pulse={c === "#20E3A2"} />
              </span>
            </div>
          ))}
        </div>
      </Card>
      <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <p className="text-[13.5px] font-bold text-t1">SafeHaven Core <span className="font-mono text-pri">v1.0.0</span></p>
          <p className="mt-0.5 text-[12px] text-t3">Build 2026.08.14 · ONNX Runtime 1.18 · CUDA 12.4 · uptime 21d 06h</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => s.toast("warning", "Restart scheduled", "Engine will recycle at the next idle window.")}>SCHEDULE RESTART</Button>
      </Card>
    </div>
  );
}

/* ---------- page ---------- */

const TABS = ["DETECTION", "THRESHOLDS", "ALERTS", "MODEL", "SYSTEM"];

export default function Settings() {
  const s = useStore();
  const tab = s.route.tab ?? "detection";
  return (
    <div className="space-y-5">
      <Tabs tabs={TABS} active={tab.toUpperCase()} onChange={(t) => s.navigate("settings", { tab: t.toLowerCase() })} />
      <div key={tab} className="anim-fadeup">
        {tab === "detection" && <DetectionTab />}
        {tab === "thresholds" && <ThresholdsTab />}
        {tab === "alerts" && <AlertsTab />}
        {tab === "model" && <ModelTab />}
        {tab === "system" && <SystemTab />}
      </div>
    </div>
  );
}
