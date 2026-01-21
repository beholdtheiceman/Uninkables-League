import React from "react";

export default function MultiDivisionStatsPage() {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="card">
        <div style={{ fontSize: 20, fontWeight: 800 }}>Multi-Division Stats</div>
        <div style={{ opacity: 0.75, marginTop: 6 }}>
          Cross-division performance for players/teams (Lorcana ink divisions).
        </div>
      </div>

      <div className="grid2">
        <div className="card">
          <strong>Players</strong>
          <div style={{ opacity: 0.85, marginTop: 8 }}>
            Track players who participate in multiple ink divisions.
          </div>
        </div>
        <div className="card">
          <strong>Teams</strong>
          <div style={{ opacity: 0.85, marginTop: 8 }}>
            Compare team performance across divisions/seasons.
          </div>
        </div>
      </div>

      <div className="card" style={{ opacity: 0.85 }}>
        Next step: wire this to your standings/ledger tables and build filters (season, division,
        team, player).
      </div>
    </div>
  );
}

