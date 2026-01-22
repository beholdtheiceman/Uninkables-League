import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext.jsx";

export default function LoginPanel() {
  const { user, refresh } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("login");
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Request failed");
      await refresh();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    await refresh();
  }

  return (
    <div className="card" style={{ display: "grid", gap: 10 }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <strong>Account</strong>
        {user ? (
          <button onClick={logout}>Logout</button>
        ) : (
          <div className="row">
            <button onClick={() => setMode("login")} className={mode === "login" ? "tab tabActive" : "tab"}>Login</button>
            <button onClick={() => setMode("register")} className={mode === "register" ? "tab tabActive" : "tab"}>Register</button>
          </div>
        )}
      </div>

      {user ? (
        <div>Signed in as <strong>{user.email}</strong></div>
      ) : (
        <>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!busy) submit();
            }}
            style={{ display: "grid", gap: 8 }}
          >
            <input placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input placeholder="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button disabled={busy} type="submit">
              {busy ? "Working..." : mode === "login" ? "Login" : "Create account"}
            </button>
          </form>
          {err ? <div style={{ color: "#ff9aa2" }}>{err}</div> : null}
        </>
      )}
    </div>
  );
}
