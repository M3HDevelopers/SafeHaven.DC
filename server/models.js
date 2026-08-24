/* ---------------- SafeHaven — Mongoose schemas ---------------- */
const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["ADMIN", "OPERATOR", "VIEWER"], default: "OPERATOR" },
    status: { type: String, enum: ["Active", "Suspended"], default: "Active" },
    lastLogin: { type: String, default: "Never" },
    resetToken: { type: String, default: null },
    resetExpires: { type: Date, default: null },
  },
  { timestamps: true }
);

const CameraSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true }, // CAM-01 style client id
    name: String,
    location: String,
    kind: { type: String, enum: ["webcam", "video", "image", "rtsp"], default: "rtsp" },
    status: { type: String, default: "online" },
    fps: { type: Number, default: 0 },
    resolution: String,
    endpoint: String,
    deviceId: String,
    facing: String,
    fileName: String,
    createdAt: Number,
    lastHeartbeat: Number,
    threats: { type: Number, default: 0 },
    detections: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const IncidentSchema = new mongoose.Schema(
  {
    incId: { type: String, required: true, unique: true }, // SH-10001
    label: String,
    confidence: Number,
    sourceId: String,
    sourceName: String,
    time: Number,
    severity: { type: String, enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"] },
    status: { type: String, enum: ["New", "Reviewing", "Reviewed"], default: "New" },
    model: String,
    box: { x: Number, y: Number, w: Number, h: Number },
    img: String, // base64 dataURL snapshot (optional)
  },
  { timestamps: true }
);
IncidentSchema.index({ time: -1 });

const ModelSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    file: { type: String, required: true }, // filename inside ./model
    version: { type: String, default: "custom" },
    classes: [String],
    size: String,
    accuracy: { type: Number, default: 0 },
    fps: { type: Number, default: 0 },
    status: { type: String, enum: ["ACTIVE", "STANDBY", "DEPRECATED"], default: "STANDBY" },
    origin: { type: String, default: "backend" },
    uploaded: String,
  },
  { timestamps: true }
);

const SettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: "main", unique: true },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

module.exports = {
  User: mongoose.model("User", UserSchema),
  Camera: mongoose.model("Camera", CameraSchema),
  Incident: mongoose.model("Incident", IncidentSchema),
  Model: mongoose.model("Model", ModelSchema),
  Settings: mongoose.model("Settings", SettingsSchema),
};
