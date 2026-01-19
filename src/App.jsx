import React, { useState } from "react";
import { AuthProvider, useAuth } from "./contexts/AuthContext.jsx";
import LoginPanel from "./components/LoginPanel.jsx";
import PlayHub from "./components/PlayHub.jsx";

function InnerApp() {
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <div className="container" style={{ display: "grid", gap: 16 }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Uninkables League Hub</div>
          <div style={{ opacity: 0.75, fontSize: 13 }}>PlayHub (Team League) â€” MVP scaffold</div>
        </div>
        <button onClick={() => setOpen(true)} disabled={loading || !user}>
          Open PlayHub
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
        <LoginPanel />
        <div className="card">
          <strong>Status</strong>
          <div style={{ marginTop: 8, opacity: 0.85 }}>
            {loading
              ? "Checking session..."
              : user
                ? "Authenticated. Next: implement League/Season data + role-gated Admin."
                : "Login to start."}
          </div>
        </div>
      </div>

      <PlayHub open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <InnerApp />
    </AuthProvider>
  );
}
