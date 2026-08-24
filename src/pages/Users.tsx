import React, { useState } from "react";
import { UserPlus, MoreHorizontal, Trash2, ShieldCheck, Eye, Radar, KeyRound } from "lucide-react";
import { useStore } from "../lib/store";
import { Card, Button, Modal, ModalHead, ConfirmModal, Field, Input, Select, Avatar, Dropdown, cx } from "../lib/ui";
import type { UserRec } from "../lib/data";

const ROLE_META: Record<UserRec["role"], { c: string; d: string }> = {
  ADMIN: { c: "#22D3EE", d: "Full access" },
  OPERATOR: { c: "#3B82F6", d: "Monitoring + incidents" },
  VIEWER: { c: "#64748B", d: "Read-only" },
};

function RoleBadge({ role }: { role: UserRec["role"] }) {
  const m = ROLE_META[role];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 font-mono text-[10.5px] font-bold tracking-wider" style={{ color: m.c, background: `${m.c}14`, border: `1px solid ${m.c}33` }}>
      {role}
    </span>
  );
}

function AddUserModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const s = useStore();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRec["role"]>("OPERATOR");
  const valid = name.trim() && username.trim() && email.includes("@") && password.length >= 6;
  return (
    <Modal open={open} onClose={onClose} width="max-w-md">
      <ModalHead title="ADD USER" sub="Provision a new console account" onClose={onClose} />
      <div className="space-y-4 p-6">
        <Field label="Full Name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Jordan Reyes" /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Username"><Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="j.reyes" className="font-mono text-[12px]" /></Field>
          <Field label="Role">
            <Select value={role} onChange={(v) => setRole(v as UserRec["role"])} options={(Object.keys(ROLE_META) as UserRec["role"][]).map((r) => ({ value: r, label: `${r} — ${ROLE_META[r].d}` }))} />
          </Field>
        </div>
        <Field label="Email"><Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="j.reyes@safehaven.ai" /></Field>
        <p className="rounded-lg border border-line bg-ink px-3.5 py-2.5 font-mono text-[10.5px] text-t3">
          TEMP PASSWORD <span className="text-pri">sh-{Math.random().toString(36).slice(2, 8)}</span> · forced rotation on first sign-in
        </p>
      </div>
      <div className="flex justify-end gap-2.5 border-t border-line px-6 py-4">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" disabled={!valid} onClick={() => { void s.addUser({ name: name.trim(), username: username.trim(), role, email: email.trim(), password }); onClose(); setName(""); setUsername(""); setEmail(""); setPassword(""); }}>
          <UserPlus size={14} /> Create User
        </Button>
      </div>
    </Modal>
  );
}

export default function Users() {
  const s = useStore();
  const [add, setAdd] = useState(false);
  const [del, setDel] = useState<UserRec | null>(null);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2.5">
          {(Object.keys(ROLE_META) as UserRec["role"][]).map((r) => (
            <span key={r} className="flex items-center gap-2 rounded-lg border border-line bg-card px-3 py-1.5 font-mono text-[10px] text-t3">
              <RoleBadge role={r} /> {ROLE_META[r].d}
            </span>
          ))}
        </div>
        <Button variant="primary" onClick={() => setAdd(true)}><UserPlus size={15} /> ADD USER</Button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead>
              <tr className="bg-[#0D1420]">
                {["NAME", "USERNAME", "ROLE", "STATUS", "LAST LOGIN", ""].map((h, i) => (
                  <th key={h || i} className="px-5 py-3 font-mono text-[10px] font-semibold tracking-[0.14em] text-t3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {s.users.map((u) => (
                <tr key={u.id} className="border-t border-line transition-colors duration-100 hover:bg-pri/4">
                  <td className="px-5 py-3.5">
                    <span className="flex items-center gap-3">
                      <Avatar name={u.name} size={34} tone={ROLE_META[u.role].c} />
                      <span>
                        <span className="block text-[13px] font-semibold text-t1">{u.name}</span>
                        <span className="block text-[11px] text-t3">{u.email}</span>
                      </span>
                    </span>
                  </td>
                  <td className="px-5 py-3.5 font-mono text-[12px] text-t2">@{u.username}</td>
                  <td className="px-5 py-3.5"><RoleBadge role={u.role} /></td>
                  <td className="px-5 py-3.5">
                    <span className={cx(
                      "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 font-mono text-[10.5px] font-semibold",
                      u.status === "Active" ? "bg-safe/10 text-safe" : "bg-warn/10 text-warn"
                    )}>
                      <span className={cx("h-1.5 w-1.5 rounded-full", u.status === "Active" ? "bg-safe" : "bg-warn")} />
                      {u.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 font-mono text-[11.5px] text-t2">{u.lastLogin}</td>
                  <td className="px-5 py-3.5 text-right">
                    <Dropdown
                      button={
                        <button aria-label={`Actions for ${u.name}`} className="flex h-8 w-8 items-center justify-center rounded-lg text-t2 transition-colors hover:bg-white/5 hover:text-t1">
                          <MoreHorizontal size={15} />
                        </button>
                      }
                      items={[
                        { label: u.status === "Active" ? "Suspend account" : "Reactivate account", icon: <KeyRound size={13} />, onClick: () => { s.toggleUser(u.id); s.toast(u.status === "Active" ? "warning" : "success", u.status === "Active" ? "Account suspended" : "Account reactivated", `${u.username} · sessions ${u.status === "Active" ? "terminated" : "restored"}.`); } },
                        { label: "Delete user", icon: <Trash2 size={13} />, danger: true, onClick: () => setDel(u) },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="flex flex-wrap items-center gap-4 p-5">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-ink text-pri"><ShieldCheck size={17} /></span>
        <p className="flex-1 text-[12px] leading-relaxed text-t3">
          Role changes propagate within 30 seconds across active sessions. <span className="text-t2">OPERATOR</span> accounts can acknowledge incidents; <span className="text-t2">VIEWER</span> accounts receive read-only dashboards with <Eye size={11} className="inline" /> watermarking.
        </p>
        <span className="font-mono text-[10px] tracking-wider text-t3"><Radar size={11} className="mr-1 inline text-pri" />RBAC v2 · AUDIT LOGGED</span>
      </Card>

      <AddUserModal open={add} onClose={() => setAdd(false)} />
      <ConfirmModal
        open={!!del}
        title={`Delete ${del?.name}?`}
        body={`This revokes all credentials for @${del?.username} and terminates active sessions immediately. Audit history is preserved.`}
        onCancel={() => setDel(null)}
        onConfirm={() => { if (del) s.deleteUser(del.id); setDel(null); }}
      />
    </div>
  );
}
