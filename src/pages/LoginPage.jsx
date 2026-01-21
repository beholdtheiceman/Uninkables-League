import React from "react";
import LoginPanel from "../components/LoginPanel.jsx";

export default function LoginPage() {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="card">
        <div style={{ fontSize: 20, fontWeight: 800 }}>Login</div>
        <div style={{ opacity: 0.75, marginTop: 6 }}>
          Sign in to access PlayHub pages.
        </div>
      </div>
      <div className="card">
        <LoginPanel />
      </div>
    </div>
  );
}

