import React, { useEffect, useMemo, useState } from "react";
import { fetchJson } from "../../utils/api.js";

export default function AdminTab({ leagueId, seasonId, onLeagueChanged, onSeasonChanged }) {
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);

  const [leagueName, setLeagueName] = useState("");
  const [leagueDescription, setLeagueDescription] = useState("");
  const [seasonName, setSeasonName] = useState("");
  const [weekIndex, setWeekIndex] = useState("1");

  const [teams, setTeams] = useState([]);

  async function loadTeams() {
    if (!seasonId) return;
    setLoading(true);
    setErr(null);
    try {
      const d = await fetchJson(`/api/seasons/${seasonId}/teams`);
      setTeams(d.teams || []);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTeams();
  }, [seasonId]);

  const unapprovedTeams = useMemo(
    () => teams.filter((t) => t.rosterSubmittedAt && !t.rosterApprovedAt),
    [teams]
  );

  async function createLeague() {
    if (!leagueName.trim()) return;
    setLoading(true);
    setErr(null);
    try {
      const d = await fetchJson("/api/leagues", {
        method: "POST",
        body: JSON.stringify({ name: leagueName.trim(), description: leagueDescription.trim() || undefined })
      });
      onLeagueChanged(d.league.id);
      setLeagueName("");
      setLeagueDescription("");
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function createSeason() {
    if (!leagueId) return;
    if (!seasonName.trim()) return;
    setLoading(true);
    setErr(null);
    try {
      const d = await fetchJson(`/api/leagues/${leagueId}/seasons`, {
        method: "POST",
        body: JSON.stringify({ name: seasonName.trim() })
      });
      onSeasonChanged(d.season.id);
      setSeasonName("");
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function approveRoster(teamId) {
    if (!seasonId) return;
    setLoading(true);
    setErr(null);
    try {
      await fetchJson(`/api/seasons/${seasonId}/teams/${teamId}/roster/approve`, { method: "POST" });
      await loadTeams();
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function generateWeek() {
    if (!seasonId) return;
    const wi = Number(weekIndex);
    if (!Number.isInteger(wi) || wi < 1) {
      setErr("Week index must be a positive integer");
      return;
    }

    setLoading(true);
    setErr(null);
    try {
      await fetchJson(`/api/seasons/${seasonId}/weeks/${wi}/admin-generate`, {
        method: "POST",
        body: JSON.stringify({ open: true })
      });
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="card" style={{ display: "grid", gap: 10 }}>
        <strong>Admin</strong>
        <div style={{ fontSize: 12, opacity: 0.8 }}>
          Admin access is currently granted via <code>PLAYHUB_ADMIN_EMAILS</code> (comma-separated) or LeagueMember role.
        </div>
        {err ? <div style={{ color: "#ff9aa2" }}>{err}</div> : null}
      </div>

      <div className="card" style={{ display: "grid", gap: 10 }}>
        <strong>Create League</strong>
        <input value={leagueName} onChange={(e) => setLeagueName(e.target.value)} placeholder="League name" />
        <input value={leagueDescription} onChange={(e) => setLeagueDescription(e.target.value)} placeholder="Description (optional)" />
        <button disabled={loading} onClick={createLeague}>Create league</button>
      </div>

      <div className="card" style={{ display: "grid", gap: 10 }}>
        <strong>Create Season</strong>
        <div style={{ fontSize: 12, opacity: 0.8 }}>Select a league above first.</div>
        <input value={seasonName} onChange={(e) => setSeasonName(e.target.value)} placeholder="Season name (e.g., 2026 S1)" />
        <button disabled={loading || !leagueId} onClick={createSeason}>Create season</button>
      </div>

      <div className="card" style={{ display: "grid", gap: 10 }}>
        <strong>Roster Approvals</strong>
        <button disabled={loading || !seasonId} onClick={loadTeams}>Refresh</button>
        {!seasonId ? (
          <div style={{ opacity: 0.8 }}>Select a season above.</div>
        ) : unapprovedTeams.length ? (
          <div style={{ display: "grid", gap: 8 }}>
            {unapprovedTeams.map((t) => (
              <div key={t.id} className="row" style={{ justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{t.name}</div>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>Captain: {t.captain?.email}</div>
                </div>
                <button disabled={loading} onClick={() => approveRoster(t.id)}>Approve</button>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ opacity: 0.8 }}>No rosters pending approval.</div>
        )}
      </div>

      <div className="card" style={{ display: "grid", gap: 10 }}>
        <strong>Generate Week (test generator)</strong>
        <div style={{ fontSize: 12, opacity: 0.8 }}>
          Creates matchups + seeded pairings by slotIndex for approved rosters. (Placeholder pairing schedule.)
        </div>
        <div className="row">
          <input value={weekIndex} onChange={(e) => setWeekIndex(e.target.value)} placeholder="Week index" />
          <button disabled={loading || !seasonId} onClick={generateWeek}>Generate</button>
        </div>
      </div>
    </div>
  );
}