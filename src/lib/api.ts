/* ---------------- SafeHaven API layer ----------------
   Backend mode: talks to the Express + MongoDB server (server/ folder).
   Local mode:   everything persists in localStorage + IndexedDB, so the app
   is fully usable in the browser and syncs to Mongo once the backend URL is set. */

import type { CameraSource, Incident, ModelInfo, Settings, UserRec } from "./data";

let backendUrl = localStorage.getItem("sh_backend_url") || "http://localhost:5000/api";
let backendOk = false;

export const getBackendUrl = () => backendUrl;
export const setBackendUrl = (u: string) => {
  backendUrl = u.replace(/\/+$/, "");
  localStorage.setItem("sh_backend_url", backendUrl);
};
export const isBackendOk = () => backendOk;

async function http<T>(path: string, opts: RequestInit = {}, timeout = 4000): Promise<T> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  const token = localStorage.getItem("sh_token") || "";
  try {
    const r = await fetch(`${backendUrl}${path}`, {
      ...opts,
      signal: ctrl.signal,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(opts.headers || {}),
      },
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return (await r.json()) as T;
  } finally {
    clearTimeout(t);
  }
}

export async function pingBackend(url?: string): Promise<boolean> {
  if (url) setBackendUrl(url);
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2200);
    const r = await fetch(`${backendUrl}/health`, { signal: ctrl.signal });
    clearTimeout(t);
    backendOk = r.ok;
  } catch {
    backendOk = false;
  }
  return backendOk;
}

/* ---------------- IndexedDB (blobs: video/image files, ONNX models) ---------------- */

const DB_NAME = "safehaven";
function idb(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const d = req.result;
      if (!d.objectStoreNames.contains("blobs")) d.createObjectStore("blobs");
    };
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

export async function putBlob(key: string, blob: Blob) {
  const d = await idb();
  return new Promise<void>((res, rej) => {
    const tx = d.transaction("blobs", "readwrite");
    tx.objectStore("blobs").put(blob, key);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}

export async function getBlob(key: string): Promise<Blob | undefined> {
  const d = await idb();
  return new Promise((res) => {
    const tx = d.transaction("blobs", "readonly");
    const q = tx.objectStore("blobs").get(key);
    q.onsuccess = () => res(q.result as Blob | undefined);
    q.onerror = () => res(undefined);
  });
}

export async function delBlob(key: string) {
  const d = await idb();
  return new Promise<void>((res) => {
    const tx = d.transaction("blobs", "readwrite");
    tx.objectStore("blobs").delete(key);
    tx.oncomplete = () => res();
    tx.onerror = () => res();
  });
}

/* ---------------- localStorage collections ---------------- */

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, val: unknown) {
  localStorage.setItem(key, JSON.stringify(val));
}

export const local = {
  get cameras() { return read<CameraSource[]>("sh_cameras", []); },
  set cameras(v: CameraSource[]) { write("sh_cameras", v); },
  get incidents() { return read<Incident[]>("sh_incidents", []); },
  set incidents(v: Incident[]) { write("sh_incidents", v.slice(0, 400)); },
  get models() { return read<ModelInfo[]>("sh_models", []); },
  set models(v: ModelInfo[]) { write("sh_models", v); },
  get users() { return read<UserRec[]>("sh_users", []); },
  set users(v: UserRec[]) { write("sh_users", v); },
  get settings() { return read<Partial<Settings>>("sh_settings", {}); },
  set settings(v: Partial<Settings>) { write("sh_settings", v); },
};

/* ---------------- hashing + local auth ---------------- */

export async function hashPw(pw: string): Promise<string> {
  const data = new TextEncoder().encode(`safehaven::${pw}`);
  const dig = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(dig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export interface LocalUser extends UserRec { passwordHash: string }

export async function ensureLocalAdmin() {
  const users = read<LocalUser[]>("sh_users", []);
  if (!users.length) {
    users.push({
      id: "U-01", name: "Admin User", username: "admin", role: "ADMIN", status: "Active",
      lastLogin: "Never", email: "admin@safehaven.ai", passwordHash: await hashPw("admin123"),
    });
    write("sh_users", users);
  }
}

export async function localLogin(username: string, password: string): Promise<UserRec> {
  const users = read<LocalUser[]>("sh_users", []);
  const u = users.find((x) => x.username.toLowerCase() === username.trim().toLowerCase());
  if (!u) throw new Error("User not found");
  if (u.status === "Suspended") throw new Error("Account suspended — contact an administrator");
  if (u.passwordHash !== (await hashPw(password))) throw new Error("Invalid password");
  u.lastLogin = new Date().toLocaleString("en", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  write("sh_users", users);
  const { passwordHash: _ph, ...pub } = u;
  void _ph;
  localStorage.setItem("sh_token", `local:${u.id}`);
  return pub;
}

export async function localRegister(d: { name: string; username: string; email: string; password: string; role?: UserRec["role"] }): Promise<UserRec> {
  const users = read<LocalUser[]>("sh_users", []);
  if (users.some((x) => x.username.toLowerCase() === d.username.trim().toLowerCase())) throw new Error("Username already exists");
  const u: LocalUser = {
    id: `U-${String(users.length + 1).padStart(2, "0")}`,
    name: d.name.trim(), username: d.username.trim(), email: d.email.trim(),
    role: d.role || "OPERATOR", status: "Active", lastLogin: "Never",
    passwordHash: await hashPw(d.password),
  };
  users.push(u);
  write("sh_users", users);
  const { passwordHash: _ph, ...pub } = u;
  void _ph;
  return pub;
}

export async function localResetPassword(username: string, newPassword: string): Promise<void> {
  const users = read<LocalUser[]>("sh_users", []);
  const u = users.find((x) => x.username.toLowerCase() === username.trim().toLowerCase());
  if (!u) throw new Error("User not found");
  u.passwordHash = await hashPw(newPassword);
  write("sh_users", users);
}

/* ---------------- backend-aware CRUD adapters ---------------- */

export async function apiLogin(username: string, password: string): Promise<UserRec> {
  if (backendOk) {
    const r = await http<{ token: string; user: UserRec }>("/auth/login", { method: "POST", body: JSON.stringify({ username, password }) });
    localStorage.setItem("sh_token", r.token);
    return r.user;
  }
  return localLogin(username, password);
}

export async function apiRegister(d: { name: string; username: string; email: string; password: string }): Promise<UserRec> {
  if (backendOk) {
    const r = await http<{ token: string; user: UserRec }>("/auth/register", { method: "POST", body: JSON.stringify(d) });
    localStorage.setItem("sh_token", r.token);
    return r.user;
  }
  return localRegister(d);
}

export async function apiForgotPassword(email: string): Promise<{ message: string; resetToken?: string }> {
  if (backendOk) {
    return http<{ message: string; resetToken?: string }>("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) });
  }
  throw new Error("LOCAL_MODE");
}

export async function apiResetPassword(token: string, newPassword: string): Promise<void> {
  await http("/auth/reset-password", { method: "POST", body: JSON.stringify({ token, newPassword }) });
}

export async function apiFetch<T>(path: string, fallback: T, mutate?: (v: T) => void): Promise<T> {
  if (backendOk) {
    try {
      const v = await http<T>(path);
      if (mutate) mutate(v);
      return v;
    } catch { /* fall through to local */ }
  }
  return fallback;
}

export async function apiSend(path: string, body: unknown, method: "POST" | "PUT" | "DELETE" = "POST") {
  if (!backendOk) return false;
  try {
    await http(path, { method, body: body === undefined ? undefined : JSON.stringify(body) });
    return true;
  } catch {
    return false;
  }
}

export async function fetchModelFile(): Promise<{ buffer: ArrayBuffer; name: string } | null> {
  if (!backendOk) return null;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 20000);
    const token = localStorage.getItem("sh_token") || "";
    const r = await fetch(`${backendUrl}/models/active/file`, { signal: ctrl.signal, headers: token ? { Authorization: `Bearer ${token}` } : {} });
    clearTimeout(t);
    if (!r.ok) return null;
    const name = r.headers.get("x-model-name") || "backend-model.onnx";
    const cls = r.headers.get("x-model-classes");
    if (cls) localStorage.setItem("sh_backend_model_classes", cls);
    return { buffer: await r.arrayBuffer(), name };
  } catch {
    return null;
  }
}
