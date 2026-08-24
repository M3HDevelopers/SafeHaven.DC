# SafeHaven Backend — Express + MongoDB

Full REST backend for the SafeHaven AI Security console: JWT auth (register / login /
forgot-password / reset), CRUD for cameras, incidents, models, users and settings,
**automatic model-folder detection**, snapshot sync and an RTSP → MJPEG proxy.

## 1. Requirements

- Node.js 18+
- MongoDB (local `mongod` or a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster)
- *(optional)* `ffmpeg` installed on the server — only needed for RTSP camera streams

## 2. Run it

```bash
cd server
cp .env.example .env        # then set MONGODB_URI (and JWT_SECRET!)
npm install
npm start                   # → http://localhost:5000
```

A default admin is seeded on first boot: **admin / admin123** (change it).

## 3. Connect the frontend

1. Build the frontend: `npm run build` (project root) — the backend also serves `../dist`,
   so you can open `http://localhost:5000` directly and everything works same-origin.
2. Or open the frontend separately, go to **Detection Settings → SYSTEM tab**,
   paste `http://localhost:5000/api` (or your deployed URL) and press **CONNECT**.
   The header badge flips to **MongoDB Synced** and all CRUD persists server-side.

## 4. Your AI model (auto-detected)

Paste your trained model into `server/model/`:

```
server/model/
├── weapon-detector.onnx          ← your YOLOv5/YOLOv8 ONNX export
└── weapon-detector.classes.txt   ← optional: one class per line
```

- Detected on startup **and** watched live — drop a file in while running and it registers itself.
- Served to the browser, where ONNX Runtime runs real inference on your camera/video/image.
- The first model becomes ACTIVE; switch models in **Detection Models → ACTIVATE**.
- Class names containing `gun / weapon / firearm / knife / blade…` raise threat incidents,
  alert panels, the emergency bar, sound and browser notifications.

## 5. Deploy

Works anywhere Node runs — VPS (Ubuntu: `node index.js` under `pm2` or systemd),
Render, Railway, DigitalOcean App Platform:

```bash
pm2 start index.js --name safehaven-api
```

Set `MONGODB_URI` to your Atlas connection string, point your domain at the server,
and paste the public URL (`https://your-domain.com/api`) into the console's System tab.

## 6. API surface

| Area | Endpoints |
|------|-----------|
| Health | `GET /api/health` |
| Auth | `POST /api/auth/register · login · forgot-password · reset-password`, `GET /api/auth/me` |
| Cameras | `GET/POST /api/cameras`, `POST /api/cameras/sync · test`, `DELETE /api/cameras/:id`, `GET /api/cameras/:id/stream` (MJPEG) |
| Incidents | `GET /api/incidents`, `POST /api/incidents · /incidents/sync`, `PUT /api/incidents/:id/review`, `DELETE /api/incidents/:id` |
| Models | `GET /api/models`, `GET /api/models/active/file`, `GET /api/models/:id/file`, `PUT /api/models/active/:id`, `POST /api/models/upload`, `DELETE /api/models/:id` |
| Settings | `GET/PUT /api/settings` |
| Users | `GET/POST /api/users`, `PUT /api/users/:id/toggle`, `DELETE /api/users/:id` (admin) |

## 7. Forgot-password flow

`POST /api/auth/forgot-password { email }` generates a 30-minute reset token —
logged to the server console (and emailed if SMTP_* env vars are set).
`POST /api/auth/reset-password { token, newPassword }` completes the reset.
Without a backend, the login page offers a local on-device recovery instead.
