import React from "react";
import { Link } from "react-router-dom";

export default function CurrentSeasonLandingPage() {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="card">
        <div style={{ fontSize: 20, fontWeight: 800 }}>Current Season</div>
        <div style={{ opacity: 0.75, marginTop: 6 }}>
          Season Alpha — view weeks, forms, schedule, teams, and standings.
        </div>
      </div>

      <Link
        to="/current-season/alpha/weeks"
        className="card linkCard"
        style={{ textDecoration: "none" }}
      >
        <div style={{ fontWeight: 800, fontSize: 16 }}>Season Alpha</div>
        <div style={{ opacity: 0.8, marginTop: 6 }}>
          Weeks, forms, schedule, teams, standings, stats, and scouting.
        </div>
        <div style={{ opacity: 0.65, marginTop: 10, fontSize: 12 }}>Open season →</div>
      </Link>

      <div className="card">
        <strong>Players</strong>
        <div style={{ opacity: 0.85, marginTop: 8 }}>
          - <Link to="/current-season/player-directory">Player Directory</Link>
        </div>
      </div>
    </div>
  );
}

