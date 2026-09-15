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
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  
  return (
    <Modal open={open} onClose={onClose} width="max-w-md">
      <ModalHead title="SMS Alert Setup" sub="Configure SMS notifications via Twilio" onClose={onClose} />
      <div className="space-y-4 p-6">
        {!s.backendOk && (
          <div className="rounded-lg border border-warn/40 bg-warn/8 px-4 py-3">
            <p className="text-[11px] text-warn font-semibold">⚠ Backend Required</p>
            <p className="text-[10.5px] text-t3 mt-1">SMS alerts require backend server. Configure settings now, they'll work once backend is connected.</p>
          </div>
        )}
        
        <Field label="Twilio Account SID">
          <Input value={f.sid} onChange={set("sid")} placeholder="ACxxxxxxxxxxxxxxxx" className="font-mono text-[12px]" />
        </Field>
        <Field label="Twilio Auth Token">
          <Input type="password" value={f.token} onChange={set("token")} placeholder="••••••••••••••••" autoComplete="off" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Sender Number">
            <Input value={f.from} onChange={set("from")} placeholder="+1 555 0100" className="font-mono text-[12px]" />
          </Field>
          <Field label="Recipient Numbers">
            <Input value={f.to} onChange={set("to")} placeholder="+91 98xxxxxx00, +91 98xxxxxx01" className="font-mono text-[12px]" />
          </Field>
        </div>
        
        <div className="rounded-lg border border-line bg-ink p-3">
          <p className="text-[11px] font-semibold text-t1 mb-1">Setup Steps:</p>
          <ol className="space-y-1 text-[10.5px] text-t3">
            <li>1. Create Twilio account at twilio.com</li>
            <li>2. Get Account SID and Auth Token from dashboard</li>
            <li>3. Buy a phone number for sending SMS</li>
            <li>4. Enter details above and save</li>
          </ol>
        </div>
      </div>
      <div className="flex justify-end gap-2.5 border-t border-line px-6 py-4">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={() => { s.saveSettings({ smsCfg: f, sms: true }); onClose(); }}>
          <Save size={13} /> Save Configuration
        </Button>
      </div>
    </Modal>
  );
}

function EmailModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const s = useStore();
  const [f, setF] = useState(s.settings.emailCfg ?? { host: "", port: "587", user: "", pass: "", to: "", enc: "TLS" as "TLS" | "SSL" });
  const set = (k: "host" | "port" | "user" | "pass" | "to") => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  
  return (
    <Modal open={open} onClose={onClose} width="max-w-md">
      <ModalHead title="Email Alert Setup" sub="Configure SMTP server for email notifications" onClose={onClose} />
      <div className="space-y-4 p-6">
        {!s.backendOk && (
          <div className="rounded-lg border border-warn/40 bg-warn/8 px-4 py-3">
            <p className="text-[11px] text-warn font-semibold">⚠ Backend Required</p>
            <p className="text-[10.5px] text-t3 mt-1">Email alerts require backend server. Configure settings now, they'll work once backend is connected.</p>
          </div>
        )}
        
        <div className="grid grid-cols-[1fr_110px] gap-4">
          <Field label="SMTP Host">
            <Input value={f.host} onChange={set("host")} placeholder="smtp.gmail.com" className="font-mono text-[12px]" />
          </Field>
          <Field label="Port">
            <Input value={f.port} onChange={set("port")} className="font-mono text-[12px]" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Email Username">
            <Input value={f.user} onChange={set("user")} placeholder="alerts@gmail.com" />
          </Field>
          <Field label="Email Password">
            <Input type="password" value={f.pass} onChange={set("pass")} placeholder="App password" autoComplete="new-password" />
          </Field>
        </div>
        <Field label="Recipient Emails">
          <Input value={f.to} onChange={set("to")} placeholder="soc@company.com, manager@company.com" />
        </Field>
        <Field label="Encryption">
          <Select value={f.enc} onChange={(v) => setF({ ...f, enc: v as "TLS" | "SSL" })} options={[{ value: "TLS", label: "TLS (recommended)" }, { value: "SSL", label: "SSL" }]} />
        </Field>
        
        <div className="rounded-lg border border-line bg-ink p-3">
          <p className="text-[11px] font-semibold text-t1 mb-1">Common SMTP Settings:</p>
          <div className="space-y-1 text-[10.5px] text-t3">
            <p><strong className="text-t2">Gmail:</strong> smtp.gmail.com, Port 587, TLS, App Password required</p>
            <p><strong className="text-t2">Outlook:</strong> smtp-mail.outlook.com, Port 587, TLS</p>
            <p><strong className="text-t2">Yahoo:</strong> smtp.mail.yahoo.com, Port 465, SSL</p>
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2.5 border-t border-line px-6 py-4">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={() => { s.saveSettings({ emailCfg: f, email: true }); onClose(); }}>
          <Save size={13} /> Save Configuration
        </Button>
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
        <p className="text-[14px] font-bold text-t1 mb-4">Detection Options</p>
        <ToggleRow title="Weapon / Threat Detection" desc="Alert on weapons (gun, knife, etc.) detected by your model." on={s.settings.weaponDetection} onChange={(v) => t({ weaponDetection: v })} />
        <ToggleRow title="Person Detection" desc="Show person boxes without alerts (useful for crowd monitoring)." on={s.settings.personDetection} onChange={(v) => t({ personDetection: v })} />
        <ToggleRow title="Show Bounding Boxes" desc="Draw colored boxes around detected objects in the video." on={s.settings.boxes} onChange={(v) => t({ boxes: v })} />
        <ToggleRow title="Show Confidence Labels" desc="Display class name and confidence % above each box." on={s.settings.labels} onChange={(v) => t({ labels: v })} />
      </Card>
      
      <Card className="p-6">
        <p className="text-[14px] font-bold text-t1 mb-4">Threat Keywords</p>
        <div className="mt-3">
          <Input value={s.settings.threatClasses} onChange={(e) => t({ threatClasses: e.target.value })} placeholder="bat, hammer, axe, stick — comma separated" />
        </div>
        <p className="mt-2 text-[11.5px] leading-relaxed text-t3">
          Add custom keywords here. If your model detects any class containing these words, it will raise an alert.
          <br /><strong className="text-t2">Built-in:</strong> gun, weapon, firearm, pistol, rifle, knife, blade, dagger, sword
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
  return (
    <Card className="p-6">
      <div className="max-w-2xl space-y-8">
        <div>
          <p className="text-[14px] font-bold text-t1 mb-2">Confidence Threshold</p>
          <p className="text-[12px] text-t3 mb-3">Minimum confidence required to trigger an alert. Lower = more detections, higher = fewer false alarms.</p>
          <div className="mt-3"><Slider value={conf} min={0.1} max={0.9} step={0.05} onChange={setConf} format={(v) => `${Math.round(v * 100)}%`} /></div>
          <p className="mt-2 text-[11px] text-t3">
            <strong className="text-t2">Recommended:</strong> 45% for weapons, 60% for general objects
          </p>
        </div>
        
        <div>
          <p className="text-[14px] font-bold text-t1 mb-2">IOU Threshold</p>
          <p className="text-[12px] text-t3 mb-3">Merges overlapping detection boxes. Higher = stricter merging, lower = keeps more boxes.</p>
          <div className="mt-3"><Slider value={iou} min={0.1} max={0.9} step={0.05} onChange={setIou} format={(v) => `${Math.round(v * 100)}%`} /></div>
          <p className="mt-2 text-[11px] text-t3">
            <strong className="text-t2">Recommended:</strong> 50% (default)
          </p>
        </div>
        
        <div>
          <p className="text-[14px] font-bold text-t1 mb-2">Alert Cooldown</p>
          <p className="text-[12px] text-t3 mb-3">Wait time before sending another alert for the same threat type on the same camera.</p>
          <div className="mt-3"><Slider value={cool} min={5} max={300} step={5} onChange={setCool} format={(v) => `${v}s`} /></div>
          <p className="mt-2 text-[11px] text-t3">
            <strong className="text-t2">Recommended:</strong> 30 seconds to avoid alert spam
          </p>
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

  const channels = [
    { 
      icon: <Volume2 size={17} />, 
      c: "#22D3EE", 
      title: "Sound Alerts", 
      desc: "Play alert sound when threat detected. Works immediately, no backend needed.", 
      on: s.settings.sound, 
      onToggle: (v: boolean) => s.saveSettings({ sound: v }, true), 
      onCfg: () => s.testSound(), 
      cfg: "Test Sound",
      ready: true
    },
    { 
      icon: <MessageSquare size={17} />, 
      c: "#20E3A2", 
      title: "SMS Alerts", 
      desc: "Send SMS to phone numbers when threat detected. Requires backend + Twilio account.", 
      on: s.settings.sms, 
      onToggle: (v: boolean) => s.saveSettings({ sms: v }, true), 
      onCfg: () => setSmsOpen(true), 
      cfg: s.settings.smsCfg ? "Configure" : "Setup",
      ready: !!s.settings.smsCfg && s.backendOk
    },
    { 
      icon: <Mail size={17} />, 
      c: "#38BDF8", 
      title: "Email Alerts", 
      desc: "Send email with snapshot when threat detected. Requires backend + SMTP server.", 
      on: s.settings.email, 
      onToggle: (v: boolean) => s.saveSettings({ email: v }, true), 
      onCfg: () => setEmailOpen(true), 
      cfg: s.settings.emailCfg ? "Configure" : "Setup",
      ready: !!s.settings.emailCfg && s.backendOk
    },
    { 
      icon: <Globe size={17} />, 
      c: "#FF9F1C", 
      title: "Browser Notifications", 
      desc: "Show desktop/mobile notifications. Works immediately, no backend needed.", 
      on: s.settings.browser, 
      onToggle: (v: boolean) => { if (v && "Notification" in window) void Notification.requestPermission(); s.saveSettings({ browser: v }, true); }, 
      onCfg: () => s.toast("info", "Test notification sent", "Check your notification center."), 
      cfg: "Test Notification",
      ready: true
    },
  ];

  return (
    <div className="space-y-5">
      <Card className="p-5 border-pri/25 bg-pri/4">
        <p className="text-[13px] font-bold text-t1 mb-2">Alert Channels</p>
        <p className="text-[12px] text-t3">
          <strong className="text-safe">✓ Works now:</strong> Sound & Browser notifications work immediately.<br />
          <strong className="text-warn">⚠ Needs backend:</strong> SMS & Email require backend setup (you'll configure later).
        </p>
      </Card>

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
                  <span className={cx("font-mono text-[10px] font-bold tracking-wider", ch.ready ? "text-safe" : "text-warn")}>
                    {ch.ready ? "READY" : "NEEDS SETUP"}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
      
      {smsOpen && <SmsModal open onClose={() => setSmsOpen(false)} />}
      {emailOpen && <EmailModal open onClose={() => setEmailOpen(false)} />}
    </div>
  );
}

function ModelTab() {
  const s = useStore();
  return (
    <div className="space-y-5">
      <Card className="p-6">
        <p className="text-[14px] font-bold text-t1 mb-4">Current Model</p>
        <div className="rounded-lg border border-line bg-ink p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-semibold text-t1">{s.engine.modelName}</p>
              <p className="font-mono text-[10px] text-t3 mt-1">Status: {s.engine.state.toUpperCase()}</p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => s.navigate("models")}>
              Change Model
            </Button>
          </div>
        </div>
        <p className="mt-3 text-[11.5px] leading-relaxed text-t3">
          Go to <strong className="text-pri">Detection Models</strong> tab to upload or change your trained model.
        </p>
      </Card>

      <Card className="p-6 border-pri/25 bg-pri/4">
        <p className="text-[14px] font-bold text-t1 mb-3">How to Use Your Model</p>
        <ol className="space-y-2 text-[12px] text-t3">
          <li><strong className="text-t1">1.</strong> You have a trained model (.pt file from YOLOv5/v8)</li>
          <li><strong className="text-t1">2.</strong> Go to <strong className="text-pri">Detection Models</strong> tab</li>
          <li><strong className="text-t1">3.</strong> Upload your .pt file - you'll get a conversion script</li>
          <li><strong className="text-t1">4.</strong> Run the Python script to convert .pt → .onnx</li>
          <li><strong className="text-t1">5.</strong> Upload the converted .onnx file</li>
          <li><strong className="text-t1">6.</strong> Model is ready! Start detection on cameras or media</li>
        </ol>
        <p className="mt-3 text-[11px] text-t3">
          <strong className="text-safe">Tip:</strong> The conversion script is provided automatically when you upload a .pt file.
        </p>
      </Card>
    </div>
  );
}

function SystemTab() {
  const s = useStore();
  const [url, setUrl] = useState(getBackendUrl());
  const [checking, setChecking] = useState(false);

  return (
    <div className="space-y-5">
      <Card className="p-6">
        <p className="text-[14px] font-bold text-t1 mb-4">Backend Connection</p>
        <p className="text-[12px] text-t3 mb-4">
          Connect to your backend server for persistent storage, SMS/Email alerts, and multi-user support.
        </p>
        
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Field label="Backend URL">
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="http://localhost:5000/api" className="font-mono text-[12.5px]" />
            </Field>
          </div>
          <Button variant="primary" disabled={checking} onClick={async () => { setChecking(true); await s.connectBackend(url); setChecking(false); }}>
            {checking ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} {checking ? "CONNECTING…" : "CONNECT"}
          </Button>
        </div>

        <div className="mt-4 rounded-lg border border-line bg-ink p-4">
          <p className="text-[12px] font-semibold text-t1 mb-2">Current Status:</p>
          <div className="flex items-center gap-2">
            <Dot color={s.backendOk ? "#20E3A2" : "#FF9F1C"} pulse={s.backendOk} />
            <span className={cx("text-[12px] font-semibold", s.backendOk ? "text-safe" : "text-warn")}>
              {s.backendOk ? "Connected to backend" : "Running in local mode (browser only)"}
            </span>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-pri/25 bg-pri/4 p-4">
          <p className="text-[12px] font-semibold text-t1 mb-2">Backend Setup (When Ready):</p>
          <ol className="space-y-1.5 text-[11px] text-t3">
            <li><strong className="text-t2">1.</strong> Install MongoDB on your server</li>
            <li><strong className="text-t2">2.</strong> Run: <span className="font-mono text-pri">cd server && npm install</span></li>
            <li><strong className="text-t2">3.</strong> Copy .env.example to .env and set MONGODB_URI</li>
            <li><strong className="text-t2">4.</strong> Run: <span className="font-mono text-pri">npm start</span></li>
            <li><strong className="text-t2">5.</strong> Paste backend URL above and click CONNECT</li>
          </ol>
          <p className="mt-2 text-[10.5px] text-t3">
            <strong className="text-safe">Note:</strong> Everything works without backend (local mode). Backend adds: persistent storage, SMS/Email alerts, multi-user support.
          </p>
        </div>
      </Card>

      <Card className="p-6">
        <p className="text-[14px] font-bold text-t1 mb-4">System Information</p>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-line/70">
            <span className="text-[12px] text-t2">AI Engine</span>
            <span className="flex items-center gap-2 font-mono text-[11px]">
              <Dot color={s.engine.state === "ready" ? "#20E3A2" : "#FF9F1C"} pulse={s.engine.state === "ready"} />
              <span className="text-t1">{s.engine.modelName}</span>
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-line/70">
            <span className="text-[12px] text-t2">Inference Speed</span>
            <span className="font-mono text-[11px] text-t1">{s.metrics.fps.toFixed(1)} FPS · {s.metrics.latency}ms</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-line/70">
            <span className="text-[12px] text-t2">Local Storage</span>
            <span className="font-mono text-[11px] text-t1">{s.incidents.length} incidents · {s.sources.length} sources</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-[12px] text-t2">Version</span>
            <span className="font-mono text-[11px] text-pri">SafeHaven v1.1.0</span>
          </div>
        </div>
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
