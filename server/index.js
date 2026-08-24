/* ---------------- SafeHaven API server ----------------
   Express + MongoDB (Mongoose) + JWT auth + model folder auto-detection.

   Quick start:
     1. cp .env.example .env   → set MONGODB_URI
     2. npm install
     3. paste your .onnx model into ./model   (optional — auto-detected)
     4. npm start  →  http://localhost:5000/api/health
*/
require("dotenv").config();
const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const { router, scanModelFolder, watchModelFolder, ensureAdmin } = require("./routes");

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/safehaven";

async function main() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log(`[SafeHaven] MongoDB connected: ${MONGODB_URI}`);
  } catch (e) {
    console.error(`[SafeHaven] MongoDB connection failed (${MONGODB_URI})`);
    console.error(e.message);
    console.error("[SafeHaven] Start MongoDB or update MONGODB_URI in .env — exiting.");
    process.exit(1);
  }

  await ensureAdmin();
  await scanModelFolder();
  watchModelFolder();

  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "8mb" }));

  app.use("/api", router);

  // Serve the built frontend (../dist) so the whole product runs from one origin
  const dist = path.join(__dirname, "..", "dist");
  if (fs.existsSync(dist)) {
    app.use(express.static(dist));
    app.get("*", (_req, res) => res.sendFile(path.join(dist, "index.html")));
  }

  app.listen(PORT, () => {
    console.log(`[SafeHaven] API listening on http://localhost:${PORT}`);
    console.log(`[SafeHaven] Model folder watched at: ${path.join(__dirname, "model")}`);
  });
}

main();
