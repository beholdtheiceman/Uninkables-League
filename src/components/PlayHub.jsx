import React, { useMemo, useState } from "react";
import StandingsTab from "./playhub/StandingsTab.jsx";
import ThisWeekTab from "./playhub/ThisWeekTab.jsx";
import TeamsTab from "./playhub/TeamsTab.jsx";
import AdminTab from "./playhub/AdminTab.jsx";
import { useAuth } from "../contexts/AuthContext.jsx";

export default function PlayHub({ open, onClose }) {
  const { user } = useAuth();

  const tabs = useMemo(() => {
    const base = [
      { key: "standings", label: "Standings", el: <StandingsTab /> },
      { key: "thisweek", label: "This Week", el: <ThisWeekTab /> },
      { key: "teams", label: "Teams", el: <TeamsTab /> }
    ];
    if (user) base.push({ key: "admin", label: "Admin", el: <AdminTab /> });
    return base;
  }, [user]);

  const [active, setActive] = useState("standings");

  if (!open) return null;

  return (
    <div className="modalOverlay" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <strong>PlayHub</strong>
          <button onClick={onClose}>Close</button>
        </div>

        <div className="tabs" style={{ marginTop: 10 }}>
          {tabs.map((t) => (
            <button
              key={t.key}
              className={active === t.key ? "tab tabActive" : "tab"}
              onClick={() => setActive(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ marginTop: 12 }}>
          {tabs.find((t) => t.key === active)?.el}
        </div>
      </div>
    </div>
  );
}
