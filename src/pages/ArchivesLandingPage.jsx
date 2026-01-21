import React from "react";
import { Link } from "react-router-dom";

const inks = [
  { key: "amber", name: "Amber" },
  { key: "amethyst", name: "Amethyst" },
  { key: "emerald", name: "Emerald" },
  { key: "ruby", name: "Ruby" },
  { key: "sapphire", name: "Sapphire" },
  { key: "steel", name: "Steel" }
];

export default function ArchivesLandingPage() {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="card">
        <div style={{ fontSize: 20, fontWeight: 800 }}>Archives</div>
        <div style={{ opacity: 0.75, marginTop: 6 }}>
          Past seasons, champions, and historical stats by ink division.
        </div>
      </div>

      <div className="grid3">
        {inks.map((ink) => (
          <Link
            key={ink.key}
            to={`/archives/${ink.key}`}
            className="card linkCard"
            style={{ textDecoration: "none" }}
          >
            <div style={{ fontWeight: 800, fontSize: 16 }}>{ink.name} Archives</div>
            <div style={{ opacity: 0.75, marginTop: 8 }}>
              Champions, standings history, and season summaries.
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

