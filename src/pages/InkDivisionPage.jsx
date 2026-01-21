import React, { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import PlayHub from "../components/PlayHub.jsx";
import { fetchJson } from "../utils/api.js";

const seasons = new Map([["alpha", "Season Alpha"]]);

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

  const inkName = seasons.get((ink || "").toLowerCase());
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

  const [currentSeasonId, setCurrentSeasonId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      setErr(null);
      try {
        const leagues = await fetchJson("/api/leagues");
        const only = (leagues.leagues || [])[0];
        if (!only?.id) {
          if (alive) setCurrentSeasonId(null);
          return;
        }
        const detail = await fetchJson(`/api/leagues/${only.id}`);
        if (alive) setCurrentSeasonId(detail?.league?.currentSeasonId || null);
      } catch (e) {
        if (alive) setErr(e.message);
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="card">
        <div style={{ fontSize: 20, fontWeight: 800 }}>{title}</div>
        <div style={{ opacity: 0.75, marginTop: 6 }}>
          Season Alpha pages for the Lorcana Team League.
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
            This page is bound to the league’s current season (managed in-app).
          </div>
          {loading ? <div className="card">Loading season…</div> : null}
          {err ? <div className="card" style={{ color: "#ff9aa2" }}>{err}</div> : null}
          {!loading && !currentSeasonId ? (
            <div className="card" style={{ opacity: 0.85 }}>
              No current season found yet. Admins: create a season and set it to REGULAR in PlayHub Admin.
            </div>
          ) : (
            <PlayHub
              tab={playHubTab}
              hideTabs
              fixedSeasonId={currentSeasonId}
              hideSeasonSelector
            />
          )}
        </div>
      ) : null}
    </div>
  );
}

