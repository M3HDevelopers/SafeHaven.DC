/* ---------------- SafeHaven — API routes ----------------
   Auth (JWT) · Cameras CRUD · Incidents CRUD · Models (folder auto-detect)
   Settings · Users CRUD · Health · RTSP proxy (ffmpeg) */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const { spawn } = require("child_process");
const express = require("express");
const { User, Camera, Incident, Model, Settings } = require("./models");

const router = express.Router();
const SECRET = process.env.JWT_SECRET || "safehaven-dev-secret";
const MODEL_DIR = path.join(__dirname, "model");
if (!fs.existsSync(MODEL_DIR)) fs.mkdirSync(MODEL_DIR, { recursive: true });

const sign = (u) => jwt.sign({ id: u._id, username: u.username, role: u.role }, SECRET, { expiresIn: "7d" });
const publicUser = (u) => ({
  id: u._id.toString(), name: u.name, username: u.username, email: u.email,
  role: u.role, status: u.status, lastLogin: u.lastLogin,
});

/* ---------------- middleware ---------------- */
function auth(req, res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing token" });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
function adminOnly(req, res, next) {
  if (req.user?.role !== "ADMIN") return res.status(403).json({ error: "Admin access required" });
  next();
}

/* ---------------- health ---------------- */
router.get("/health", (_req, res) => res.json({ ok: true, service: "safehaven-api", time: Date.now() }));

/* ---------------- auth ---------------- */
router.post("/auth/register", async (req, res) => {
  try {
    const { name, username, email, password, role } = req.body || {};
    if (!name || !username || !email || !password) return res.status(400).json({ error: "All fields required" });
    if (password.length < 6) return res.status(400).json({ error: "Password must be ≥ 6 characters" });
    if (await User.findOne({ $or: [{ username: username.toLowerCase() }, { email: email.toLowerCase() }] }))
      return res.status(409).json({ error: "Username or email already exists" });
    const u = await User.create({ name, username, email, passwordHash: await bcrypt.hash(password, 10), role: role || "OPERATOR" });
    res.status(201).json({ token: sign(u), user: publicUser(u) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body || {};
    const u = await User.findOne({ username: (username || "").toLowerCase() });
    if (!u) return res.status(404).json({ error: "User not found" });
    if (u.status === "Suspended") return res.status(403).json({ error: "Account suspended" });
    if (!(await bcrypt.compare(password || "", u.passwordHash))) return res.status(401).json({ error: "Invalid password" });
    u.lastLogin = new Date().toLocaleString();
    await u.save();
    res.json({ token: sign(u), user: publicUser(u) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/auth/forgot-password", async (req, res) => {
  try {
    const { email } = req.body || {};
    const u = await User.findOne({ email: (email || "").toLowerCase() });
    if (!u) return res.status(404).json({ error: "No account with that email" });
    const token = crypto.randomBytes(24).toString("hex");
    u.resetToken = token;
    u.resetExpires = new Date(Date.now() + 30 * 60 * 1000);
    await u.save();
    // SMTP optional — always log the token so the flow is testable
    console.log(`\n[SafeHaven] Password reset for ${u.username}: token = ${token}\n`);
    res.json({ message: "Reset token generated (see server console / email).", resetToken: process.env.SMTP_HOST ? undefined : token });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/auth/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body || {};
    const u = await User.findOne({ resetToken: token, resetExpires: { $gt: new Date() } });
    if (!u) return res.status(400).json({ error: "Invalid or expired reset token" });
    u.passwordHash = await bcrypt.hash(newPassword || "", 10);
    u.resetToken = null;
    u.resetExpires = null;
    await u.save();
    res.json({ message: "Password updated — sign in with the new password." });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get("/auth/me", auth, async (req, res) => {
  const u = await User.findById(req.user.id);
  if (!u) return res.status(404).json({ error: "User gone" });
  res.json(publicUser(u));
});

/* ---------------- cameras ---------------- */
router.get("/cameras", auth, async (_req, res) => res.json(await Camera.find().sort({ createdAt: 1 }).lean()));

router.post("/cameras", auth, async (req, res) => {
  const doc = req.body;
  const saved = await Camera.findOneAndUpdate({ id: doc.id }, doc, { upsert: true, new: true, setDefaultsOnInsert: true });
  res.status(201).json(saved);
});

router.post("/cameras/sync", auth, async (req, res) => {
  const list = req.body?.cameras || [];
  for (const c of list) await Camera.findOneAndUpdate({ id: c.id }, c, { upsert: true, setDefaultsOnInsert: true });
  res.json({ ok: true, count: list.length });
});

router.post("/cameras/test", auth, (req, res) => {
  const url = req.body?.endpoint || "";
  res.json({ ok: /^rtsp:\/\//i.test(url) });
});

router.delete("/cameras/:id", auth, async (req, res) => {
  await Camera.deleteOne({ id: req.params.id });
  res.json({ ok: true });
});

/* RTSP → MJPEG proxy (requires ffmpeg installed on the server) */
router.get("/cameras/:id/stream", auth, async (req, res) => {
  const cam = await Camera.findOne({ id: req.params.id });
  if (!cam || !cam.endpoint) return res.status(404).send("No stream endpoint for this source");
  const proc = spawn("ffmpeg", [
    "-rtsp_transport", "tcp", "-i", cam.endpoint,
    "-f", "mjpeg", "-q:v", "5", "-r", "15", "pipe:1",
  ], { stdio: ["ignore", "pipe", "pipe"] });
  const boundary = "safehavenframe";
  res.writeHead(200, { "Content-Type": `multipart/x-mixed-replace; boundary=${boundary}`, "Cache-Control": "no-store" });
  proc.stdout.on("data", (chunk) => {
    res.write(`--${boundary}\r\nContent-Type: image/jpeg\r\nContent-Length: ${chunk.length}\r\n\r\n`);
    res.write(chunk);
    res.write("\r\n");
  });
  proc.stderr.on("data", () => {});
  proc.on("close", () => res.end());
  req.on("close", () => proc.kill());
});

/* ---------------- incidents ---------------- */
router.get("/incidents", auth, async (req, res) => {
  const q = {};
  if (req.query.severity) q.severity = req.query.severity;
  if (req.query.source) q.sourceId = req.query.source;
  if (req.query.limit) return res.json(await Incident.find(q).sort({ time: -1 }).limit(+req.query.limit).lean());
  res.json(await Incident.find(q).sort({ time: -1 }).limit(500).lean());
});

router.post("/incidents", auth, async (req, res) => {
  const d = req.body;
  const saved = await Incident.findOneAndUpdate({ incId: d.id || d.incId }, { ...d, incId: d.id || d.incId }, { upsert: true, new: true });
  res.status(201).json(saved);
});

router.post("/incidents/sync", auth, async (req, res) => {
  const list = req.body?.incidents || [];
  let n = 0;
  for (const i of list.slice(0, 100)) {
    await Incident.findOneAndUpdate({ incId: i.id }, { ...i, incId: i.id, img: i.img || undefined }, { upsert: true, setDefaultsOnInsert: true });
    n++;
  }
  res.json({ ok: true, count: n });
});

router.put("/incidents/:id/review", auth, async (req, res) => {
  await Incident.updateOne({ incId: req.params.id }, { status: "Reviewed" });
  res.json({ ok: true });
});

router.delete("/incidents/:id", auth, async (req, res) => {
  await Incident.deleteOne({ incId: req.params.id });
  res.json({ ok: true });
});

/* ---------------- models (folder auto-detection) ---------------- */
function classesFor(file) {
  const p = path.join(MODEL_DIR, file.replace(/\.onnx$/i, "") + ".classes.txt");
  if (!fs.existsSync(p)) return [];
  return fs.readFileSync(p, "utf8").split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
}

async function scanModelFolder() {
  const files = fs.readdirSync(MODEL_DIR).filter((f) => f.toLowerCase().endsWith(".onnx"));
  for (const f of files) {
    const exists = await Model.findOne({ file: f });
    if (!exists) {
      const stat = fs.statSync(path.join(MODEL_DIR, f));
      const count = await Model.countDocuments();
      await Model.create({
        name: f, file: f,
        classes: classesFor(f),
        size: `${(stat.size / 1048576).toFixed(1)} MB`,
        status: count === 0 ? "ACTIVE" : "STANDBY",
        uploaded: new Date().toLocaleDateString("en", { day: "2-digit", month: "short", year: "numeric" }),
      });
      console.log(`[SafeHaven] New model auto-detected in model/ folder: ${f}`);
    }
  }
}

function watchModelFolder() {
  try {
    const chokidar = require("chokidar");
    chokidar.watch(MODEL_DIR, { ignoreInitial: true }).on("add", async (p) => {
      if (!p.toLowerCase().endsWith(".onnx")) return;
      await scanModelFolder();
    });
  } catch {
    fs.watch(MODEL_DIR, () => scanModelFolder().catch(() => {}));
  }
}

router.get("/models", auth, async (_req, res) => {
  const docs = await Model.find().lean();
  res.json(docs.map((d) => ({
    id: d._id.toString(), name: d.name, version: d.version, accuracy: d.accuracy, fps: d.fps,
    classes: d.classes.length ? d.classes : ["from model output"], uploaded: d.uploaded,
    size: d.size, status: d.status, origin: "backend",
  })));
});

router.get("/models/active/file", async (req, res) => {
  let m = await Model.findOne({ status: "ACTIVE" });
  if (!m) m = await Model.findOne();
  if (!m) return res.status(404).send("No model in server/model folder — paste a .onnx file there.");
  const p = path.join(MODEL_DIR, m.file);
  if (!fs.existsSync(p)) return res.status(404).send("Model file missing on disk");
  res.setHeader("x-model-name", m.name);
  res.setHeader("x-model-classes", JSON.stringify(m.classes));
  res.sendFile(p);
});

router.get("/models/:id/file", auth, async (req, res) => {
  const m = await Model.findById(req.params.id);
  if (!m) return res.status(404).send("Model not found");
  res.setHeader("x-model-name", m.name);
  res.sendFile(path.join(MODEL_DIR, m.file));
});

router.put("/models/active/:id", auth, async (req, res) => {
  await Model.updateMany({}, { status: "STANDBY" });
  await Model.updateOne({ _id: req.params.id }, { status: "ACTIVE" });
  res.json({ ok: true });
});

const upload = multer({ dest: MODEL_DIR, limits: { fileSize: 400 * 1048576 } });
router.post("/models/upload", auth, upload.single("model"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file" });
  const finalName = req.file.originalname.toLowerCase().endsWith(".onnx") ? req.file.originalname : `${req.file.originalname}.onnx`;
  const finalPath = path.join(MODEL_DIR, finalName);
  fs.renameSync(req.file.path, finalPath);
  await scanModelFolder();
  const m = await Model.findOne({ file: finalName });
  if (m && (await Model.countDocuments({ status: "ACTIVE" })) === 0) { m.status = "ACTIVE"; await m.save(); }
  res.status(201).json({ ok: true, file: finalName });
});

router.delete("/models/:id", auth, async (req, res) => {
  const m = await Model.findById(req.params.id);
  if (m) {
    const p = path.join(MODEL_DIR, m.file);
    if (fs.existsSync(p)) fs.unlinkSync(p);
    await m.deleteOne();
  }
  res.json({ ok: true });
});

/* ---------------- settings ---------------- */
router.get("/settings", auth, async (_req, res) => {
  const doc = await Settings.findOne({ key: "main" });
  res.json(doc?.data ?? {});
});

router.put("/settings", auth, async (req, res) => {
  await Settings.findOneAndUpdate({ key: "main" }, { key: "main", data: req.body }, { upsert: true });
  res.json({ ok: true });
});

/* ---------------- users (admin) ---------------- */
router.get("/users", auth, async (_req, res) => {
  res.json((await User.find().lean()).map((u) => ({
    id: u._id.toString(), name: u.name, username: u.username, email: u.email,
    role: u.role, status: u.status, lastLogin: u.lastLogin,
  })));
});

router.post("/users", auth, adminOnly, async (req, res) => {
  const { name, username, email, password, role } = req.body || {};
  if (!name || !username || !email || !password) return res.status(400).json({ error: "All fields required" });
  const u = await User.create({ name, username, email, passwordHash: await bcrypt.hash(password, 10), role: role || "OPERATOR" });
  res.status(201).json(publicUser(u));
});

router.put("/users/:id/toggle", auth, adminOnly, async (req, res) => {
  const u = await User.findById(req.params.id);
  if (!u) return res.status(404).json({ error: "User not found" });
  u.status = u.status === "Active" ? "Suspended" : "Active";
  await u.save();
  res.json(publicUser(u));
});

router.delete("/users/:id", auth, adminOnly, async (req, res) => {
  await User.deleteOne({ _id: req.params.id });
  res.json({ ok: true });
});

module.exports = { router, scanModelFolder, watchModelFolder, ensureAdmin };

/* ---------------- seed default admin ---------------- */
async function ensureAdmin() {
  const count = await User.countDocuments();
  if (count === 0) {
    await User.create({
      name: "Admin User", username: "admin", email: "admin@safehaven.ai",
      passwordHash: await bcrypt.hash("admin123", 10), role: "ADMIN",
    });
    console.log("[SafeHaven] Seeded default admin → admin / admin123 (change it!)");
  }
}
