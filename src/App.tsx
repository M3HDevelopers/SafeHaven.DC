import React, { useState } from "react";
import { StoreProvider, useStore } from "./lib/store";
import { AppShell } from "./lib/layout";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Live from "./pages/Live";
import Logs from "./pages/Logs";
import Cameras from "./pages/Cameras";
import Models from "./pages/Models";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import Users from "./pages/Users";
import Profile from "./pages/Profile";

function PageView() {
  const s = useStore();
  switch (s.route.page) {
    case "live": return <Live />;
    case "logs": return <Logs />;
    case "cameras": return <Cameras />;
    case "models": return <Models />;
    case "analytics": return <Analytics />;
    case "settings": return <Settings />;
    case "users": return <Users />;
    case "profile": return <Profile />;
    default: return <Dashboard />;
  }
}

function Gate() {
  const s = useStore();
  const [view, setView] = useState<"landing" | "login">("landing");

  if (s.authed) {
    return (
      <AppShell>
        <PageView />
      </AppShell>
    );
  }
  return view === "landing"
    ? <Landing onEnter={() => setView("login")} />
    : <Login onBack={() => setView("landing")} />;
}

export default function App() {
  return (
    <StoreProvider>
      <Gate />
    </StoreProvider>
  );
}
