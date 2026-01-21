import React from "react";
import { Link } from "react-router-dom";

const inks = [
  { key: "amber", name: "Amber", desc: "Support, healing, and singing." },
  { key: "amethyst", name: "Amethyst", desc: "Draw, bounce, and tricky tempo." },
  { key: "emerald", name: "Emerald", desc: "Evasion, disruption, and pressure." },
  { key: "ruby", name: "Ruby", desc: "Removal, challenges, and control." },
  { key: "sapphire", name: "Sapphire", desc: "Ramp, items, and value engines." },
  { key: "steel", name: "Steel", desc: "Damage, bodies, and durability." }
];

export default function CurrentSeasonLandingPage() {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="card">
        <div style={{ fontSize: 20, fontWeight: 800 }}>Current Season</div>
        <div style={{ opacity: 0.75, marginTop: 6 }}>
          Choose an ink division to view weeks, forms, schedule, teams, and standings.
        </div>
      </div>

      <div className="grid3">
        {inks.map((ink) => (
          <Link
            key={ink.key}
            to={`/current-season/${ink.key}/weeks`}
            className="card linkCard"
            style={{ textDecoration: "none" }}
          >
            <div style={{ fontWeight: 800, fontSize: 16 }}>{ink.name}</div>
            <div style={{ opacity: 0.8, marginTop: 6 }}>{ink.desc}</div>
            <div style={{ opacity: 0.65, marginTop: 10, fontSize: 12 }}>
              View division →
            </div>
          </Link>
        ))}
      </div>

      <div className="card">
        <strong>Players</strong>
        <div style={{ opacity: 0.85, marginTop: 8 }}>
          - <Link to="/current-season/player-directory">Player Directory</Link>
          <br />
          - <Link to="/current-season/multi-division-stats">Multi-Division Stats</Link>
        </div>
      </div>
    </div>
  );
}

