import React, { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import PlayHub from "../components/PlayHub.jsx";
import { fetchJson } from "../utils/api.js";
import ThisWeekTab from "../components/playhub/ThisWeekTab.jsx";
import StandingsTab from "../components/playhub/StandingsTab.jsx";

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
  const [note, setNote] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [notes, setNotes] = useState([]);

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

  // local scouting notes (no DB/migrations needed yet)
  useEffect(() => {
    if (!currentSeasonId) return;
    try {
      const raw = localStorage.getItem(`scouting.notes.${currentSeasonId}`);
      const parsed = raw ? JSON.parse(raw) : [];
      setNotes(Array.isArray(parsed) ? parsed : []);
    } catch {
      setNotes([]);
    }
  }, [currentSeasonId]);

  useEffect(() => {
    if (!currentSeasonId) return;
    try {
      localStorage.setItem(`scouting.notes.${currentSeasonId}`, JSON.stringify(notes));
    } catch {
      // ignore
    }
  }, [currentSeasonId, notes]);

  function saveNote() {
    const text = note.trim();
    if (!text) return;
    const tags = tagInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    setNotes((prev) => [
      { id: crypto?.randomUUID?.() || String(Date.now()), text, tags, createdAt: new Date().toISOString() },
      ...prev
    ]);
    setNote("");
    setTagInput("");
  }

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
          {!currentSeasonId ? (
            <div style={{ opacity: 0.85 }}>
              No current season found yet. Admins: create a season and set it to REGULAR in PlayHub Admin.
            </div>
          ) : (
            <>
              <div style={{ opacity: 0.85 }}>
                In-site forms for scheduling and results (no external spreadsheets).
              </div>
              <div className="card" style={{ padding: 12 }}>
                <div style={{ fontWeight: 700 }}>Match Scheduling & Results</div>
                <div style={{ opacity: 0.8, marginTop: 6 }}>
                  Propose times, confirm schedules, report scores, confirm results, and dispute if needed.
                </div>
                <div style={{ marginTop: 12 }}>
                  <ThisWeekTab seasonId={currentSeasonId} />
                </div>
              </div>
              <div className="card" style={{ padding: 12 }}>
                <div style={{ fontWeight: 700 }}>Rosters</div>
                <div style={{ opacity: 0.8, marginTop: 6 }}>
                  Captains manage rosters under <Link to="/current-season/alpha/teams">Teams</Link>.
                </div>
              </div>
            </>
          )}
        </div>
      ) : null}

      {sec === "stats" ? (
        <div className="card" style={{ display: "grid", gap: 10 }}>
          <strong>Stats</strong>
          {!currentSeasonId ? (
            <div style={{ opacity: 0.85 }}>
              No current season found yet. Admins: create a season and set it to REGULAR in PlayHub Admin.
            </div>
          ) : (
            <>
              <div style={{ opacity: 0.85 }}>
                Live standings-based stats from the league database.
              </div>
              <StandingsTab seasonId={currentSeasonId} />
            </>
          )}
        </div>
      ) : null}

      {sec === "scouting" ? (
        <div className="card" style={{ display: "grid", gap: 10 }}>
          <strong>Scouting</strong>
          {!currentSeasonId ? (
            <div style={{ opacity: 0.85 }}>
              No current season found yet. Admins: create a season and set it to REGULAR in PlayHub Admin.
            </div>
          ) : (
            <>
              <div style={{ opacity: 0.85 }}>
                Keep scouting notes here. (Currently stored locally in your browser; we can move this into the DB next.)
              </div>
              <div className="card" style={{ padding: 12, display: "grid", gap: 10 }}>
                <div style={{ fontWeight: 700 }}>Add note</div>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={5}
                  placeholder="Write matchup notes, archetypes, sideboard plans, tendencies…"
                />
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="Tags (comma-separated) e.g. aggro, control, mirror"
                />
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <button onClick={saveNote} disabled={!note.trim()}>
                    Save note
                  </button>
                  <button
                    onClick={() => {
                      setNotes([]);
                      setNote("");
                      setTagInput("");
                    }}
                    disabled={!notes.length}
                  >
                    Clear all
                  </button>
                </div>
              </div>
              <div className="card" style={{ padding: 12, display: "grid", gap: 10 }}>
                <div style={{ fontWeight: 700 }}>Saved notes</div>
                {!notes.length ? (
                  <div style={{ opacity: 0.8 }}>No notes yet.</div>
                ) : (
                  <div style={{ display: "grid", gap: 10 }}>
                    {notes.map((n) => (
                      <div key={n.id} className="card" style={{ padding: 12 }}>
                        <div style={{ fontSize: 12, opacity: 0.75 }}>
                          {new Date(n.createdAt).toLocaleString()}
                        </div>
                        <div style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{n.text}</div>
                        {n.tags?.length ? (
                          <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {n.tags.map((t) => (
                              <span
                                key={t}
                                style={{
                                  fontSize: 12,
                                  opacity: 0.9,
                                  padding: "3px 8px",
                                  borderRadius: 999,
                                  border: "1px solid rgba(255,255,255,0.14)",
                                  background: "rgba(255,255,255,0.05)"
                                }}
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
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

