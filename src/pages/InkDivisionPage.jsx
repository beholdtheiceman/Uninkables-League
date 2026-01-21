import React, { useMemo } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import PlayHub from "../components/PlayHub.jsx";

const inks = new Map([
  ["amber", "Amber"],
  ["amethyst", "Amethyst"],
  ["emerald", "Emerald"],
  ["ruby", "Ruby"],
  ["sapphire", "Sapphire"],
  ["steel", "Steel"]
]);

const sections = [
  { key: "weeks", label: "Weeks" },
  { key: "forms", label: "Forms" },
  { key: "schedule", label: "Schedule" },
  { key: "teams", label: "Teams" },
  { key: "standings", label: "Standings" },
  { key: "stats", label: "Stats" },
  { key: "scouting", label: "Scouting" }
];

export default function InkDivisionPage() {
  const { ink, section } = useParams();

  const inkName = inks.get((ink || "").toLowerCase());
  const sec = (section || "weeks").toLowerCase();
  const isValidSection = sections.some((s) => s.key === sec);

  const title = useMemo(() => {
    if (!inkName) return "Current Season";
    const secLabel = sections.find((s) => s.key === sec)?.label || "Weeks";
    return `${inkName} — ${secLabel}`;
  }, [inkName, sec]);

  if (!inkName) return <Navigate to="/current-season" replace />;
  if (!isValidSection) return <Navigate to={`/current-season/${ink}/weeks`} replace />;

  const showPlayHub =
    sec === "teams" || sec === "standings" || sec === "schedule" || sec === "weeks";

  const playHubTab =
    sec === "teams" ? "teams" : sec === "standings" ? "standings" : "thisweek";

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="card">
        <div style={{ fontSize: 20, fontWeight: 800 }}>{title}</div>
        <div style={{ opacity: 0.75, marginTop: 6 }}>
          Division pages are Lorcana-themed. (Inks: Amber/Amethyst/Emerald/Ruby/Sapphire/Steel.)
        </div>
      </div>

      <div className="tabs" style={{ marginTop: 0 }}>
        {sections.map((s) => (
          <Link
            key={s.key}
            to={`/current-season/${ink}/${s.key}`}
            className={sec === s.key ? "tab tabActive" : "tab"}
            style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}
          >
            {s.label}
          </Link>
        ))}
      </div>

      {sec === "forms" ? (
        <div className="card" style={{ display: "grid", gap: 10 }}>
          <strong>Forms</strong>
          <div style={{ opacity: 0.85 }}>
            Add your Lorcana-specific forms here (deck list submission, results reporting, rules
            questions, etc.).
          </div>
          <div className="grid2">
            <div className="card" style={{ padding: 12 }}>
              <div style={{ fontWeight: 700 }}>Results Submission</div>
              <div style={{ opacity: 0.8, marginTop: 6 }}>
                Report match results for this week.
              </div>
            </div>
            <div className="card" style={{ padding: 12 }}>
              <div style={{ fontWeight: 700 }}>Deck List Submission</div>
              <div style={{ opacity: 0.8, marginTop: 6 }}>
                Submit or update your Lorcana deck list for the week.
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {sec === "stats" ? (
        <div className="card" style={{ display: "grid", gap: 10 }}>
          <strong>Stats</strong>
          <div style={{ opacity: 0.85 }}>
            This page is ready to host Lorcana stats (win rates, matchup breakdowns, character/item
            usage, etc.). Next step is wiring your data sources.
          </div>
          <div className="grid2">
            <div className="card" style={{ padding: 12 }}>
              <div style={{ fontWeight: 700 }}>Team Stats</div>
              <div style={{ opacity: 0.8, marginTop: 6 }}>
                Weekly points, tiebreakers, and standings history.
              </div>
            </div>
            <div className="card" style={{ padding: 12 }}>
              <div style={{ fontWeight: 700 }}>Player Stats</div>
              <div style={{ opacity: 0.8, marginTop: 6 }}>
                Per-player record, contributions, and streaks.
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {sec === "scouting" ? (
        <div className="card" style={{ display: "grid", gap: 10 }}>
          <strong>Scouting</strong>
          <div style={{ opacity: 0.85 }}>
            Add opponent notes, meta snapshots, and common archetypes for this division.
          </div>
          <div className="card" style={{ padding: 12 }}>
            <div style={{ fontWeight: 700 }}>Meta Snapshot (coming soon)</div>
            <div style={{ opacity: 0.8, marginTop: 6 }}>
              Populate from deck submissions and match results once forms are connected.
            </div>
          </div>
        </div>
      ) : null}

      {showPlayHub ? (
        <div style={{ display: "grid", gap: 12 }}>
          <div className="card" style={{ opacity: 0.85 }}>
            Select League + Season below. These pages reuse your real league data views.
          </div>
          <PlayHub tab={playHubTab} hideTabs />
        </div>
      ) : null}
    </div>
  );
}

