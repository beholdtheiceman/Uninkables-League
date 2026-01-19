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
  const [weekDetail, setWeekDetail] = useState(null);

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

  async function loadCurrentWeek() {
    if (!seasonId) return;
    setLoading(true);
    setErr(null);
    try {
      const cur = await fetchJson(`/api/seasons/${seasonId}/weeks/current`);
      if (!cur.week?.weekIndex) {
        setWeekDetail(null);
        return;
      }
      const wd = await fetchJson(`/api/seasons/${seasonId}/weeks/${cur.week.weekIndex}`);
      setWeekDetail(wd.week);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTeams();
    loadCurrentWeek();
  }, [seasonId]);

  const unapprovedTeams = useMemo(
    () => teams.filter((t) => t.rosterSubmittedAt && !t.rosterApprovedAt),
    [teams]
  );

  const allPairings = useMemo(() => {
    const matchups = weekDetail?.matchups || [];
    const out = [];
    for (const m of matchups) {
      for (const p of m.pairings || []) {
        out.push({ matchup: m, pairing: p });
      }
    }
    return out;
  }, [weekDetail]);

  const needsResolution = useMemo(
    () => allPairings.filter(({ pairing }) => pairing.state !== "FINAL"),
    [allPairings]
  );

  async function createLeague() {
    if (!leagueName.trim()) return;
    setLoading(true);
    setErr(null);
    try {
      const d = await fetchJson("/api/leagues", {
        method: "POST",
        body: JSON.stringify({
          name: leagueName.trim(),
          description: leagueDescription.trim() || undefined
        })
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

  async function resolvePairing(pairingId, payload) {
    setLoading(true);
    setErr(null);
    try {
      await fetchJson(`/api/pairings/${pairingId}/admin-resolve`, {
        method: "POST",
        body: JSON.stringify(payload)
      });
      await loadCurrentWeek();
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function finalizeCurrentWeek() {
    if (!seasonId) return;
    setLoading(true);
    setErr(null);
    try {
      const cur = await fetchJson(`/api/seasons/${seasonId}/weeks/current`);
      if (!cur.week?.id) throw new Error("No OPEN week found");
      await fetchJson(`/api/weeks/${cur.week.id}/finalize`, { method: "POST" });
      await loadCurrentWeek();
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
      await loadCurrentWeek();
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
        <strong>Resolve Pairings (Admin)</strong>
        <div style={{ fontSize: 12, opacity: 0.8 }}>
          Force-finalize unconfirmed/disputed pairings so week finalization can proceed.
        </div>
        <button disabled={loading || !seasonId} onClick={loadCurrentWeek}>Refresh current week</button>

        {!seasonId ? (
          <div style={{ opacity: 0.8 }}>Select a season above.</div>
        ) : !weekDetail ? (
          <div style={{ opacity: 0.8 }}>No OPEN week found.</div>
        ) : (
          <>
            <div style={{ opacity: 0.85 }}>Week {weekDetail.weekIndex} â€¢ State: {weekDetail.state}</div>
            {!needsResolution.length ? (
              <div style={{ opacity: 0.8 }}>No pairings need resolution.</div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {needsResolution.map(({ matchup, pairing }) => (
                  <div key={pairing.id} className="card" style={{ padding: 12 }}>
                    <div style={{ fontWeight: 700 }}>{matchup.teamA?.name} vs {matchup.teamB?.name} â€” Seed {pairing.seedIndex}</div>
                    <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>
                      {pairing.playerA?.email} vs {pairing.playerB?.email}
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>
                      State: {pairing.state} â€¢ Score: {pairing.gamesWonA}-{pairing.gamesWonB}
                    </div>
                    <div className="row" style={{ marginTop: 10, flexWrap: "wrap" }}>
                      <button disabled={loading} onClick={() => resolvePairing(pairing.id, { gamesWonA: 2, gamesWonB: 0 })}>Force 2-0 A</button>
                      <button disabled={loading} onClick={() => resolvePairing(pairing.id, { gamesWonA: 2, gamesWonB: 1 })}>Force 2-1 A</button>
                      <button disabled={loading} onClick={() => resolvePairing(pairing.id, { gamesWonA: 0, gamesWonB: 2 })}>Force 0-2 A</button>
                      <button disabled={loading} onClick={() => resolvePairing(pairing.id, { gamesWonA: 1, gamesWonB: 2 })}>Force 1-2 A</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <div className="card" style={{ display: "grid", gap: 10 }}>
        <strong>Finalize Current Week</strong>
        <div style={{ fontSize: 12, opacity: 0.8 }}>
          Writes points/MMR ledgers and locks the current OPEN week to FINAL (requires all pairings FINAL).
        </div>
        <button disabled={loading || !seasonId} onClick={finalizeCurrentWeek}>Finalize</button>
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