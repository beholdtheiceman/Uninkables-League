import React from "react";

export default function SimplePage({ title, children }) {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="card">
        <div style={{ fontSize: 20, fontWeight: 800 }}>{title}</div>
        <div style={{ opacity: 0.75, marginTop: 6 }}>
          Placeholder page — we’ll flesh this out next.
        </div>
      </div>
      {children ? <div className="card">{children}</div> : null}
    </div>
  );
}

