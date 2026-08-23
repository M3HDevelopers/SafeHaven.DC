import React, { useState } from "react";
import { LogOut, Save, Monitor, Smartphone, KeyRound, Fingerprint } from "lucide-react";
import { useStore } from "../lib/store";
import { Card, CardHead, Button, Field, Input, Avatar, Toggle, cx } from "../lib/ui";

export default function Profile() {
  const s = useStore();
  const name = localStorage.getItem("sh_user") || "Admin User";
  const [display, setDisplay] = useState(name);
  const [email, setEmail] = useState("admin@safehaven.ai");
  const [pw, setPw] = useState({ cur: "", next: "", confirm: "" });
  const [digest, setDigest] = useState(true);
  const [mention, setMention] = useState(true);
  const [sessions, setSessions] = useState([
    { id: 1, device: "MacBook Pro · Chrome 127", where: "HQ Control Room", current: true },
    { id: 2, device: "iPhone 15 · SafeHaven App", where: "Mobile · 4G", current: false },
  ]);

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
      <Card className="h-fit p-6 text-center xl:col-span-1">
        <div className="flex justify-center"><Avatar name={name} size={76} /></div>
        <h2 className="mt-4 text-[18px] font-bold text-t1">{name}</h2>
        <p className="mt-1 font-mono text-[10.5px] tracking-[0.18em] text-pri">ADMINISTRATOR</p>
        <p className="mt-3 text-[12.5px] text-t3">{email}</p>
        <div className="mt-5 grid grid-cols-3 gap-2 border-t border-line pt-5 font-mono text-[10px]">
          <div><p className="text-[15px] font-bold text-t1">214</p><p className="mt-0.5 tracking-wider text-t3">REVIEWED</p></div>
          <div><p className="text-[15px] font-bold text-t1">21d</p><p className="mt-0.5 tracking-wider text-t3">STREAK</p></div>
          <div><p className="text-[15px] font-bold text-safe">A+</p><p className="mt-0.5 tracking-wider text-t3">TRUST</p></div>
        </div>
        <Button variant="danger" size="md" className="mt-6 w-full" onClick={s.logout}><LogOut size={14} /> SIGN OUT</Button>
        <p className="mt-4 flex items-center justify-center gap-1.5 font-mono text-[9.5px] tracking-wider text-t3"><Fingerprint size={11} /> MFA ENABLED · HARDWARE KEY</p>
      </Card>

      <div className="space-y-5 xl:col-span-2">
        <Card>
          <CardHead title="ACCOUNT DETAILS" sub="Visible to other operators on this console" />
          <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
            <Field label="Display Name"><Input value={display} onChange={(e) => setDisplay(e.target.value)} /></Field>
            <Field label="Email"><Input value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
            <div className="sm:col-span-2 flex justify-end">
              <Button variant="primary" size="md" onClick={() => { localStorage.setItem("sh_user", display); s.toast("success", "Profile updated", "Account details saved."); window.location.hash = ""; }}>
                <Save size={14} /> Save Changes
              </Button>
            </div>
          </div>
        </Card>

        <Card>
          <CardHead title="CHANGE PASSWORD" sub="Rotated credentials propagate to all sessions" icon={<KeyRound size={15} />} />
          <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-3">
            <Field label="Current Password"><Input type="password" value={pw.cur} onChange={(e) => setPw({ ...pw, cur: e.target.value })} placeholder="••••••••" autoComplete="current-password" /></Field>
            <Field label="New Password"><Input type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} placeholder="Min. 12 characters" autoComplete="new-password" /></Field>
            <Field label="Confirm New"><Input type="password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} placeholder="Repeat password" autoComplete="new-password" /></Field>
            <div className="sm:col-span-3 flex items-center justify-between gap-3">
              <p className={cx("font-mono text-[10.5px]", pw.next && pw.next === pw.confirm ? "text-safe" : "text-t3")}>
                {pw.next ? (pw.next === pw.confirm ? "PASSWORDS MATCH" : "PASSWORDS DO NOT MATCH") : "ENFORCED ROTATION EVERY 90 DAYS"}
              </p>
              <Button
                variant="secondary" size="md"
                disabled={!pw.cur || !pw.next || pw.next !== pw.confirm}
                onClick={() => { setPw({ cur: "", next: "", confirm: "" }); s.toast("success", "Password changed", "All other sessions were signed out."); }}
              >
                Update Password
              </Button>
            </div>
          </div>
        </Card>

        <Card>
          <CardHead title="ACTIVE SESSIONS" sub="Devices currently authenticated to SafeHaven" icon={<Monitor size={15} />} />
          <div className="divide-y divide-line/70 px-6">
            {sessions.map((ss) => (
              <div key={ss.id} className="flex items-center justify-between gap-4 py-3.5">
                <span className="flex items-center gap-3">
                  {ss.device.includes("iPhone") ? <Smartphone size={16} className="text-t3" /> : <Monitor size={16} className="text-t3" />}
                  <span>
                    <span className="block text-[13px] font-semibold text-t1">{ss.device}</span>
                    <span className="block font-mono text-[10px] text-t3">{ss.where}</span>
                  </span>
                </span>
                {ss.current ? (
                  <span className="font-mono text-[10px] font-bold tracking-wider text-safe">THIS DEVICE</span>
                ) : (
                  <Button variant="ghost" size="sm" className="text-threat hover:bg-threat/10" onClick={() => { setSessions((p) => p.filter((x) => x.id !== ss.id)); s.toast("warning", "Session revoked", `${ss.device} signed out.`); }}>
                    REVOKE
                  </Button>
                )}
              </div>
            ))}
          </div>
          <div className="border-t border-line px-6 py-4">
            <div className="flex items-center justify-between py-1.5">
              <span className="text-[12.5px] text-t2">Daily threat digest email</span>
              <Toggle on={digest} onChange={setDigest} label="Daily digest" />
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="text-[12.5px] text-t2">Notify when I am mentioned in incident notes</span>
              <Toggle on={mention} onChange={setMention} label="Mentions" />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
