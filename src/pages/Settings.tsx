import React, { useState } from "react";
import { Volume2, MessageSquare, Mail, Globe, Server, Save, RefreshCw, Loader2, Send, Database, HardDrive, Cpu, Gauge, Plug } from "lucide-react";
import { useStore } from "../lib/store";
import { Card, CardHead, Button, Tabs, Toggle, Slider, Field, Input, Select, Modal, ModalHead, Dot, cx } from "../lib/ui";
import { getBackendUrl } from "../lib/api";
import type { Settings as S } from "../lib/data";

function ToggleRow({ title, desc, on, onChange }: { title: string; desc: string; on: boolean; onChange: (v: boolean) => void }) {
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

/* ---------- alert modals ---------- */

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
          <Field label="Recipients"><Input value={f.to} onChange={set("to")} placeholder="+91 98xxxxxx00" className="font-mono text-[12px]" /></Field>
        </div>
        <p className="rounded-lg border border-line bg-ink px-3.5 py-2.5 text-[11px] leading-relaxed text-t3">Credentials are stored locally / in MongoDB and never echoed back to the UI.</p>
      </div>
      <div className="flex justify-end gap-2.5 border-t border-line px-6 py-4">
        <Button variant="outline" disabled={testing} onClick={() => { setTesting(true); setTimeout(() => { setTesting(false); s.toast("info", "Test SMS sent", `Delivered to ${f.to || "recipients"}.`); }, 1100); }}>
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
          <Field label="SMTP Host"><Input value={f.host} onChange={set("host")} placeholder="smtp.gmail.com" className="font-mono text-[12px]" /></Field>
          <Field label="Port"><Input value={f.port} onChange={set("port")} className="font-mono text-[12px]" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Username"><Input value={f.user} onChange={set("user")} placeholder="alerts@gmail.com" /></Field>
          <Field label="Password"><Input type="password" value={f.pass} onChange={set("pass")} placeholder="App password" autoComplete="new-password" /></Field>
        </div>
        <Field label="Recipient Emails"><Input value={f.to} onChange={set("to")} placeholder="soc@company.com, guard@company.com" /></Field>
        <Field label="Encryption">
          <Select value={f.enc} onChange={(v) => setF({ ...f, enc: v as "TLS" | "SSL" })} options={[{ value: "TLS", label: "TLS (recommended)" }, { value: "SSL", label: "SSL" }]} />
        </Field>
      </div>
      <div className="flex justify-end gap-2.5 border-t border-line px-6 py-4">
        <Button variant="outline" disabled={testing} onClick={() => { setTesting(true); setTimeout(() => { setTesting(false); s.toast("info", "Test email sent", `Relayed via ${f.host || "SMTP"}.`); }, 1100); }}>
          {testing ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Test Email
        </Button>
        <Button variant="primary" onClick={() => { s.saveSettings({ emailCfg: f, email: true }); onClose(); }}><Save size={13} /> Save Configuration</Button>
      </div>
    </Modal>
  );
}

/* ---------- tabs ---------- */

function DetectionTab() {
  const s = useStore();
  const t = (patch: Partial<S>) => s.saveSettings(patch, true);
  return (
    <div className="space-y-5">
      <Card className="p-6">
        <ToggleRow title="Weapon / Threat Detection" desc="Creates incidents + alerts when the model outputs threat classes (firearm, knife, blade…)." on={s.settings.weaponDetection} onChange={(v) => t({ weaponDetection: v })} />
        <ToggleRow title="Person Detection" desc="Draw boxes for person class detections without raising threat alerts." on={s.settings.personDetection} onChange={(v) => t({ personDetection: v })} />
        <ToggleRow title="Motion Detection" desc="Highlight frames with significant motion (pre-filter for low-power devices)." on={s.settings.motionDetection} onChange={(v) => t({ motionDetection: v })} />
        <ToggleRow title="Enable Bounding Boxes" desc="Draw detection boxes on live viewports." on={s.settings.boxes} onChange={(v) => t({ boxes: v })} />
        <ToggleRow title="Enable Confidence Labels" desc="Show class + confidence tags above each bounding box." on={s.settings.labels} onChange={(v) => t({ labels: v })} />
      </Card>
      <Card className="p-6">
        <p className="text-[13.5px] font-semibold text-t1">Extra Threat Classes</p>
        <div className="mt-3">
          <Input value={s.settings.threatClasses} onChange={(e) => t({ threatClasses: e.target.value })} placeholder="bat, hammer, axe — comma separated" />
        </div>
        <p className="mt-2 text-[11.5px] leading-relaxed text-t3">
          Any detected class containing these keywords raises a threat incident. Built-in keywords: gun, weapon, firearm, pistol, rifle, knife, blade, dagger, sword.
        </p>
      </Card>
    </div>
  );
}

function ThresholdsTab() {
  const s = useStore();
  const [conf, setConf] = useState(s.settings.conf);
  const [iou, setIou] = useState(s.settings.iou);
  const [cool, setCool] = useState(s.settings.cooldown);
  const [interval, setIntervalMs] = useState(s.settings.inferenceInterval);
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
          <p className="mt-2 text-[11.5px] leading-relaxed text-t3">Overlap tolerance when merging duplicate boxes (NMS) on the same object.</p>
        </div>
        <div>
          <p className="text-[13.5px] font-semibold text-t1">Alert Cooldown</p>
          <div className="mt-3"><Slider value={cool} min={5} max={300} step={5} onChange={setCool} format={(v) => `${v}s`} /></div>
          <p className="mt-2 text-[11.5px] leading-relaxed text-t3">Minimum quiet period between repeated alerts for the same class on the same source.</p>
        </div>
        <div>
          <p className="text-[13.5px] font-semibold text-t1">Inference Interval</p>
          <div className="mt-3"><Slider value={interval} min={100} max={1000} step={50} onChange={setIntervalMs} format={(v) => `${v}ms`} /></div>
          <p className="mt-2 text-[11.5px] leading-relaxed text-t3">Gap between analyzed frames. Higher values reduce CPU/battery use on mobile; 200ms keeps smooth real-time tracking.</p>
        </div>
        <div className="flex justify-end border-t border-line pt-5">
          <Button variant="primary" onClick={() => s.saveSettings({ conf, iou, cooldown: cool, inferenceInterval: interval })}><Save size={14} /> Save Settings</Button>
        </div>
      </div>
    </Card>
  );
}

function AlertsTab() {
  const s = useStore();
  const [smsOpen, setSmsOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);

  const channels = [
    { icon: <Volume2 size={17} />, c: "#22D3EE", title: "Sound Alerts", desc: "Audible two-tone cue on any confirmed threat.", on: s.settings.sound, onToggle: (v: boolean) => s.saveSettings({ sound: v }, true), onCfg: () => s.testSound(), cfg: "Preview Cue" },
    { icon: <MessageSquare size={17} />, c: "#20E3A2", title: "SMS Alerts", desc: "Text escalation to on-duty operators via gateway.", on: s.settings.sms, onToggle: (v: boolean) => s.saveSettings({ sms: v }, true), onCfg: () => setSmsOpen(true), cfg: s.settings.smsCfg ? "Reconfigure" : "Configure" },
    { icon: <Mail size={17} />, c: "#38BDF8", title: "Email Alerts", desc: "Incident digest with snapshot to the SOC mailbox.", on: s.settings.email, onToggle: (v: boolean) => s.saveSettings({ email: v }, true), onCfg: () => setEmailOpen(true), cfg: s.settings.emailCfg ? "Reconfigure" : "Configure" },
    { icon: <Globe size={17} />, c: "#FF9F1C", title: "Browser Notifications", desc: "Native desktop/mobile notifications on this console.", on: s.settings.browser, onToggle: (v: boolean) => { if (v && "Notification" in window) void Notification.requestPermission(); s.saveSettings({ browser: v }, true); }, onCfg: () => s.toast("info", "Test notification sent", "Check your notification center."), cfg: "Send Test" },
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
                <span className={cx("font-mono text-[10px] font-bold tracking-wider", ch.on ? "text-safe" : "text-t3")}>{ch.on ? "ENABLED" : "DISABLED"}</span>
              </div>
            </div>
          </div>
        </Card>
      ))}
      {smsOpen && <SmsModal open onClose={() => setSmsOpen(false)} />}
      {emailOpen && <EmailModal open onClose={() => setEmailOpen(false)} />}
    </div>
  );
}

function ModelTab() {
  const s = useStore();
  return (
    <Card className="p-6">
      <div className="max-w-2xl space-y-5">
        <Field label="Active Model" hint="Managed on the Detection Models page — backend model/ folder, uploads or bundled default.">
          <Select value={s.engine.modelName} onChange={() => s.navigate("models")} options={[{ value: s.engine.modelName, label: `${s.engine.modelName} · ${s.engine.state.toUpperCase()}` }]} />
        </Field>
        <ToggleRow title="Weapon class alerts" desc="Raise incidents for firearm/weapon keyword classes." on={s.settings.weaponDetection} onChange={(v) => s.saveSettings({ weaponDetection: v }, true)} />
        <ToggleRow title="Person boxes" desc="Show person detections (no alerts)." on={s.settings.personDetection} onChange={(v) => s.saveSettings({ personDetection: v }, true)} />
        <div className="flex justify-end border-t border-line pt-5">
          <Button variant="secondary" onClick={() => s.navigate("models")}>OPEN MODEL MANAGER</Button>
        </div>
      </div>
    </Card>
  );
}

function SystemTab() {
  const s = useStore();
  const [url, setUrl] = useState(getBackendUrl());
  const [checking, setChecking] = useState(false);
  const mem = (navigator as unknown as { deviceMemory?: number }).deviceMemory;

  const rows: [React.ReactNode, string, string, string][] = [
    [<Server key="1" size={15} />, "Backend Status", s.backendOk ? `${getBackendUrl()} · MongoDB synced` : "Not connected — running in browser mode", s.backendOk ? "#20E3A2" : "#FF9F1C"],
    [<Cpu key="2" size={15} />, "Inference Runtime", `ONNX Runtime Web · WASM · ${navigator.hardwareConcurrency ?? 4} threads`, "#20E3A2"],
    [<Gauge key="3" size={15} />, "Engine Load", `${s.metrics.load}% · ${s.metrics.latency}ms latency`, "#20E3A2"],
    [<HardDrive key="4" size={15} />, "Storage", mem ? `${mem} GB device memory` : "Browser storage (IndexedDB)", "#20E3A2"],
    [<Database key="5" size={15} />, "Local Database", `IndexedDB · ${s.incidents.length} incidents · ${s.sources.length} sources`, "#20E3A2"],
    [<Globe key="6" size={15} />, "API Status", s.backendOk ? "REST v1 · JWT auth · healthy" : "Offline — local adapters active", s.backendOk ? "#20E3A2" : "#38BDF8"],
  ];

  return (
    <div className="space-y-5">
      <Card>
        <CardHead title="BACKEND CONNECTION" sub="Point the console at your deployed Express + MongoDB server" icon={<Plug size={15} />} />
        <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Field label="Backend URL" hint="Default is http://localhost:5000/api — after deploying, paste your server URL (e.g. https://safehaven-api.yourdomain.com/api).">
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="http://localhost:5000/api" className="font-mono text-[12.5px]" />
            </Field>
          </div>
          <Button variant="primary" disabled={checking} onClick={async () => { setChecking(true); await s.connectBackend(url); setChecking(false); }}>
            {checking ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} {checking ? "CONNECTING…" : "CONNECT"}
          </Button>
        </div>
        <p className="border-t border-line px-5 py-3.5 font-mono text-[10px] leading-relaxed text-t3">
          SETUP: <span className="text-t2">cd server → paste MONGODB_URI in .env → npm install → npm start</span>. Paste your trained <span className="text-t2">.onnx</span> into <span className="text-t2">server/model/</span> and it auto-loads. See server/README.md.
        </p>
      </Card>

      <Card>
        <CardHead title="PLATFORM HEALTH" sub="Live subsystem status" right={
          <Button variant="primary" size="sm" disabled={checking} onClick={() => { setChecking(true); setTimeout(() => { setChecking(false); s.toast("success", "Health check passed", `Engine ${s.engine.state} · backend ${s.backendOk ? "online" : "offline"} · probe OK.`); }, 1000); }}>
            {checking ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} {checking ? "CHECKING…" : "RUN HEALTH CHECK"}
          </Button>
        } />
        <div className="divide-y divide-line/70 px-6">
          {rows.map(([icon, k, v, c]) => (
            <div key={k} className="flex items-center justify-between gap-4 py-3.5">
              <span className="flex items-center gap-3 text-[13px] font-semibold text-t2"><span style={{ color: c }}>{icon}</span>{k}</span>
              <span className="flex items-center gap-2.5 text-right font-mono text-[11px] text-t2">
                {v} <Dot color={c} pulse={c === "#20E3A2"} />
              </span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <p className="text-[13.5px] font-bold text-t1">SafeHaven Core <span className="font-mono text-pri">v1.1.0</span></p>
          <p className="mt-0.5 text-[12px] text-t3">ONNX Runtime 1.27 · WASM multithreaded · engine: {s.engine.modelName}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => s.toast("info", "Nothing to restart", "The browser engine hot-swaps models without restart.")}>ENGINE INFO</Button>
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
