import React, { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PlayHub from "../components/PlayHub.jsx";

const validTabs = new Set(["standings", "thisweek", "teams", "admin"]);

export default function PlayHubPage() {
  const params = useParams();
  const navigate = useNavigate();

  const tab = useMemo(() => {
    const raw = (params.tab || "standings").toLowerCase();
    return validTabs.has(raw) ? raw : "standings";
  }, [params.tab]);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="card">
        <div style={{ fontSize: 20, fontWeight: 800 }}>PlayHub</div>
        <div style={{ opacity: 0.75, marginTop: 6 }}>
          League operations: standings, this week, teams/rosters, and admin tools.
        </div>
      </div>

      <PlayHub
        tab={tab}
        onTabChange={(next) => navigate(`/playhub/${next}`)}
      />
    </div>
  );
}

