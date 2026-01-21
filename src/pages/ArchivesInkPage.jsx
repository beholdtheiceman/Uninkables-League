import React from "react";
import { Navigate, useParams } from "react-router-dom";

const inks = new Map([
  ["amber", "Amber"],
  ["amethyst", "Amethyst"],
  ["emerald", "Emerald"],
  ["ruby", "Ruby"],
  ["sapphire", "Sapphire"],
  ["steel", "Steel"]
]);

export default function ArchivesInkPage() {
  const { ink } = useParams();
  const inkName = inks.get((ink || "").toLowerCase());
  if (!inkName) return <Navigate to="/archives" replace />;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="card">
        <div style={{ fontSize: 20, fontWeight: 800 }}>{inkName} Archives</div>
        <div style={{ opacity: 0.75, marginTop: 6 }}>
          Historical season results and highlights for this ink division.
        </div>
      </div>

      <div className="grid2">
        <div className="card">
          <strong>Season Champions</strong>
          <div style={{ opacity: 0.85, marginTop: 8 }}>
            Add champions list by season once you decide the data source.
          </div>
        </div>
        <div className="card">
          <strong>Standings History</strong>
          <div style={{ opacity: 0.85, marginTop: 8 }}>
            Plot standings over time (week-by-week) once historical weeks are stored.
          </div>
        </div>
      </div>

      <div className="card" style={{ opacity: 0.85 }}>
        Next step: persist completed seasons/weeks so archives can be auto-generated.
      </div>
    </div>
  );
}

