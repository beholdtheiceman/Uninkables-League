import React from "react";
import { useAuth } from "../contexts/AuthContext.jsx";
import LoginPanel from "../components/LoginPanel.jsx";

export default function HomePage() {
  const { user, loading } = useAuth();

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section className="card">
        <div style={{ fontSize: 20, fontWeight: 800 }}>
          Lorcana Team League - Hosted By the UNINKABLES Community and Unplugged Games
        </div>
        <div style={{ opacity: 0.75, marginTop: 6 }}>
          League hub for scheduling, teams, standings, and season operations.
        </div>
      </section>

      <section className="grid2">
        <div className="card">
          <strong>Status</strong>
          <div style={{ marginTop: 8, opacity: 0.85 }}>
            {loading
              ? "Checking session..."
              : user
                ? `Authenticated as ${user.email}.`
                : "Not logged in."}
          </div>
        </div>
        <div className="card">
          <strong>Account</strong>
          <div style={{ marginTop: 12 }}>
            <LoginPanel />
          </div>
        </div>
      </section>
    </div>
  );
}

