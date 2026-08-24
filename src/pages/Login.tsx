import React, { useState } from "react";
import { Eye, EyeOff, Loader2, ShieldCheck, ArrowRight } from "lucide-react";
import { useStore } from "../lib/store";
import { Button, Input, Field, cx } from "../lib/ui";
import { Logo } from "../lib/layout";

export default function Login({ onBack }: { onBack: () => void }) {
  const s = useStore();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErr("Enter both username and password to continue.");
      return;
    }
    setErr("");
    setBusy(true);
    setTimeout(() => {
      const name = username.trim().toLowerCase() === "admin" ? "Admin User" : username.trim();
      if (!remember) localStorage.setItem("sh_noremember", "1");
      s.login(name.charAt(0).toUpperCase() + name.slice(1));
    }, 950);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-abyss px-4">
      {/* ambient layers */}
      <div className="pointer-events-none absolute inset-0 bg-gridlines opacity-70 [mask-image:radial-gradient(ellipse_75%_65%_at_50%_40%,black,transparent)]" />
      <div className="pointer-events-none absolute left-1/2 top-[-220px] h-[560px] w-[860px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(34,211,238,0.09),transparent)]" />
      <div className="pointer-events-none absolute bottom-[-260px] right-[-160px] h-[520px] w-[520px] rounded-full bg-[radial-gradient(closest-side,rgba(59,130,246,0.07),transparent)]" />

      {/* circuit traces */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.07]" aria-hidden>
        <g stroke="#22D3EE" strokeWidth="1" fill="none">
          <path d="M0 140 H260 L320 200 H520" />
          <path d="M1440 520 H1180 L1120 460 H900" />
          <path d="M180 900 V640 L240 580 V380" />
          <path d="M1260 40 V260 L1200 320 V520" />
        </g>
        <g fill="#22D3EE">
          <circle cx="260" cy="140" r="3" /><circle cx="520" cy="200" r="3" />
          <circle cx="1180" cy="520" r="3" /><circle cx="900" cy="460" r="3" />
          <circle cx="180" cy="640" r="3" /><circle cx="1200" cy="320" r="3" />
        </g>
      </svg>

      {[
        "left-[12%] top-[24%]", "left-[22%] bottom-[18%]", "right-[16%] top-[30%]",
        "right-[26%] bottom-[24%]", "left-[45%] top-[12%]", "right-[8%] bottom-[40%]",
      ].map((p, i) => (
        <span key={p} className={cx("anim-float pointer-events-none absolute h-1 w-1 rounded-full bg-pri/40", p)} style={{ animationDelay: `${i * 0.8}s` }} />
      ))}

      <div className="anim-fadeup relative w-full max-w-[420px]">
        <button onClick={onBack} className="mb-5 font-mono text-[11px] tracking-wider text-t3 transition-colors hover:text-pri">
          ← BACK TO OVERVIEW
        </button>

        <div className="rounded-[14px] border border-line bg-card p-8 shadow-[0_28px_80px_rgba(0,0,0,0.5)]">
          <div className="mb-7 flex items-center gap-3">
            <Logo size={38} />
            <div className="leading-tight">
              <p className="text-[17px] font-extrabold tracking-tight text-t1">SafeHaven</p>
              <p className="font-mono text-[9px] font-semibold tracking-[0.22em] text-t3">AI SECURITY PLATFORM</p>
            </div>
          </div>

          <h1 className="text-[22px] font-bold text-t1">Welcome back</h1>
          <p className="mt-1.5 text-[13px] leading-relaxed text-t2">Sign in to your security operations dashboard.</p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <Field label="Username">
              <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="operator@safehaven.ai" autoComplete="username" />
            </Field>
            <Field label="Password">
              <div className="relative">
                <Input
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  autoComplete="current-password"
                  className="pr-11"
                />
                <button
                  type="button"
                  aria-label={show ? "Hide password" : "Show password"}
                  onClick={() => setShow((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-t3 transition-colors hover:text-t1"
                >
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </Field>

            <div className="flex items-center justify-between">
              <label className="flex cursor-pointer items-center gap-2 text-[12.5px] text-t2">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 rounded border-edge bg-ink accent-[#22D3EE]"
                />
                Remember me
              </label>
              <button type="button" onClick={() => s.toast("info", "Reset link sent", "Check your inbox for password recovery.")} className="text-[12.5px] font-semibold text-pri transition-colors hover:text-prisoft">
                Forgot password?
              </button>
            </div>

            {err && (
              <p className="rounded-lg border border-threat/40 bg-threat/10 px-3 py-2 text-[12px] font-medium text-threat">{err}</p>
            )}

            <Button variant="primary" size="lg" className="w-full" type="submit" disabled={busy}>
              {busy ? (<><Loader2 size={15} className="animate-spin" /> AUTHENTICATING…</>) : (<>SIGN IN <ArrowRight size={15} /></>)}
            </Button>
          </form>

          <p className="mt-5 text-center font-mono text-[10px] tracking-wider text-t3">DEMO BUILD — ANY CREDENTIALS GRANT OPERATOR ACCESS</p>
        </div>

        <p className="mt-5 flex items-center justify-center gap-2 font-mono text-[10.5px] tracking-[0.14em] text-t3">
          <ShieldCheck size={13} className="text-safe" /> PROTECTED BY SAFEHAVEN AI
        </p>
      </div>
    </div>
  );
}
