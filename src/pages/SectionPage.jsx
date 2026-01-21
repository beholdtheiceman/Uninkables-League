import React, { useMemo } from "react";
import { useLocation } from "react-router-dom";

function titleize(segment) {
  return segment
    .split("-")
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}

export default function SectionPage({ baseTitle }) {
  const { pathname } = useLocation();

  const subtitle = useMemo(() => {
    const parts = pathname.split("/").filter(Boolean);
    if (!parts.length) return "";
    const rest = parts.slice(1);
    if (!rest.length) return "";
    return rest.map(titleize).join(" / ");
  }, [pathname]);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="card">
        <div style={{ fontSize: 20, fontWeight: 800 }}>{baseTitle}</div>
        <div style={{ opacity: 0.75, marginTop: 6 }}>
          {subtitle ? subtitle : "Overview"}
        </div>
      </div>
      <div className="card" style={{ opacity: 0.85 }}>
        Placeholder page — add real content for this section.
      </div>
    </div>
  );
}

