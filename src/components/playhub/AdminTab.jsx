import React, { useEffect, useMemo, useState } from "react";
import { fetchJson } from "../../utils/api.js";

export default function AdminTab({
  seasonId,
  onSeasonChanged,
  onLeagueCreated,
  onDataChanged,
  onSeasonCreated,
  onSeasonDeleted
}) {
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);
  const [seasonMeta, setSeasonMeta] = useState(null);
  const [seasonName, setSeasonName] = useState("");

  const [weekIndex, setWeekIndex] = useState("1"); // legacy test generator
  const [openWeekIndex, setOpenWeekIndex] = useState("1");

  const [teams, setTeams] = useState([]);
  const [weekDetail, setWeekDetail] = useState(null);
  const [subRequests, setSubRequests] = useState([]);

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

  async function loadSubRequests() {
    if (!seasonId) return;
    setLoading(true);
    setErr(null);
    try {
      const d = await fetchJson(`/api/seasons/${seasonId}/sub-requests`);
      setSubRequests(d.requests || []);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTeams();
    loadCurrentWeek();
    loadSubRequests();
  }, [seasonId]);

  useEffect(() => {
    let alive = true;
    async function loadSeasonMeta() {
      if (!seasonId) {
        setSeasonMeta(null);
        return;
      }
      try {
        const d = await fetchJson(`/api/seasons/${seasonId}`);
        if (alive) setSeasonMeta(d.season || null);
      } catch {
        if (alive) setSeasonMeta(null);
      }
    }
    loadSeasonMeta();
    return () => {
      alive = false;
    };
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

  async function createSeason() {
    if (!seasonName.trim()) return;
    setLoading(true);
    setErr(null);
    try {
      const d = await fetchJson(`/api/seasons`, {
        method: "POST",
        body: JSON.stringify({ name: seasonName.trim() })
      });
      onSeasonChanged(d.season.id);
      onSeasonCreated?.(d.season);
      onDataChanged?.();
      setSeasonName("");
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function deleteSeason() {
    if (!seasonId) return;
    const name = seasonMeta?.name || "this season";
    const ok = window.confirm(
      `Are you sure you want to delete "${name}"?\n\nThis will permanently delete weeks, matchups, pairings, standings events, teams, and rosters for the season. This cannot be undone.`
    );
    if (!ok) return;

    setLoading(true);
    setErr(null);
    try {
      await fetchJson(`/api/seasons/${seasonId}`, { method: "DELETE" });
      setSeasonMeta(null);
      onSeasonChanged("");
      onSeasonDeleted?.(seasonId);
      onDataChanged?.();
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

  async function approveSubRequest(pairingId, requestId) {
    setLoading(true);
    setErr(null);
    try {
      await fetchJson(`/api/pairings/${pairingId}/sub-approve`, {
        method: "POST",
        body: JSON.stringify({ requestId })
      });
      await loadCurrentWeek();
      await loadSubRequests();
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

  async function generateFullSchedule(overwrite) {
    if (!seasonId) return;
    setLoading(true);
    setErr(null);
    try {
      await fetchJson(`/api/seasons/${seasonId}/weeks/generate-schedule`, {
        method: "POST",
        body: JSON.stringify({ overwrite: Boolean(overwrite) })
      });
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function makeCurrentSeason() {
    if (!seasonId) return;
    setLoading(true);
    setErr(null);
    try {
      await fetchJson(`/api/league/set-current-season`, {
        method: "POST",
        body: JSON.stringify({ seasonId })
      });
      onDataChanged?.(); // refresh league/seasons so dropdown phase updates immediately
      const d = await fetchJson(`/api/seasons/${seasonId}`);
      setSeasonMeta(d.season || null);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function publishSeason({ overwrite = false } = {}) {
    if (!seasonId) return;
    setLoading(true);
    setErr(null);
    try {
      // Ensure this is the current season (phase = REGULAR)
      await fetchJson(`/api/league/set-current-season`, {
        method: "POST",
        body: JSON.stringify({ seasonId })
      });
      onDataChanged?.(); // refresh dropdown phase/currentSeasonId before further actions

      // Generate schedule
      await fetchJson(`/api/seasons/${seasonId}/weeks/generate-schedule`, {
        method: "POST",
        body: JSON.stringify({ overwrite: Boolean(overwrite) })
      });

      // Open week 1
      await fetchJson(`/api/seasons/${seasonId}/weeks/1/open`, { method: "POST" });
      await loadCurrentWeek();
      const d = await fetchJson(`/api/seasons/${seasonId}`);
      setSeasonMeta(d.season || null);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function finalizeAndOpenNextWeek() {
    if (!seasonId) return;
    setLoading(true);
    setErr(null);
    try {
      const cur = await fetchJson(`/api/seasons/${seasonId}/weeks/current`);
      if (!cur.week?.id || !cur.week?.weekIndex) throw new Error("No OPEN week found");
      await fetchJson(`/api/weeks/${cur.week.id}/finalize`, { method: "POST" });
      const next = Number(cur.week.weekIndex) + 1;
      await fetchJson(`/api/seasons/${seasonId}/weeks/${next}/open`, { method: "POST" });
      await loadCurrentWeek();
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function openWeek() {
    if (!seasonId) return;
    const wi = Number(openWeekIndex);
    if (!Number.isInteger(wi) || wi < 1) {
      setErr("Open week index must be a positive integer");
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      await fetchJson(`/api/seasons/${seasonId}/weeks/${wi}/open`, { method: "POST" });
      await loadCurrentWeek();
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  // legacy test generator kept for quick testing
  async function generateWeekTest() {
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
        <strong>Create Season</strong>
        <div style={{ fontSize: 12, opacity: 0.8 }}>
          This league hosts multiple seasons. Create a new season here.
        </div>
        <input value={seasonName} onChange={(e) => setSeasonName(e.target.value)} placeholder="Season name (e.g., 2026 S1)" />
        <button disabled={loading} onClick={createSeason}>Create season</button>
      </div>

      <div className="card" style={{ display: "grid", gap: 10 }}>
        <strong>Season Admin</strong>
        <div style={{ fontSize: 12, opacity: 0.8 }}>
          Publish the season inside the site (no spreadsheets): set current season, generate schedule, open/finalize weeks.
        </div>
        {!seasonId ? (
          <div style={{ opacity: 0.8 }}>Select a season above.</div>
        ) : (
          <>
            <div style={{ fontSize: 12, opacity: 0.85 }}>
              Selected season: <strong>{seasonMeta?.name || seasonId}</strong>
              {seasonMeta?.phase ? <span> • Phase: {seasonMeta.phase}</span> : null}
            </div>
            <div className="row" style={{ flexWrap: "wrap" }}>
              <button disabled={loading} onClick={makeCurrentSeason}>
                Make Current Season
              </button>
              <button disabled={loading || !seasonId} onClick={() => publishSeason({ overwrite: false })}>
                Publish (Generate Schedule + Open Week 1)
              </button>
              <button disabled={loading || !seasonId} onClick={() => publishSeason({ overwrite: true })}>
                Overwrite & Publish
              </button>
              <button disabled={loading || !seasonId} onClick={finalizeAndOpenNextWeek}>
                Finalize Current Week & Open Next
              </button>
              <button disabled={loading || !seasonId} onClick={deleteSeason}>
                Delete season
              </button>
            </div>
          </>
        )}
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
        <strong>Substitution Requests</strong>
        <button disabled={loading || !seasonId} onClick={loadSubRequests}>Refresh</button>
        {!seasonId ? (
          <div style={{ opacity: 0.8 }}>Select a season above.</div>
        ) : subRequests.length ? (
          <div style={{ display: "grid", gap: 8 }}>
            {subRequests.map((r) => (
              <div key={r.id} className="card" style={{ padding: 12 }}>
                <div style={{ fontWeight: 700 }}>{r.status} â€” replaces {r.replacesSide}</div>
                <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>Pairing: {r.pairingId}</div>
                <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>
                  Replace: {r.replacesUser?.email} ({r.replacedMmrAtRequest}) â†’ Sub: {r.subUser?.email} ({r.subMmrAtRequest})
                </div>
                <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>Requested by: {r.requestedBy?.email}</div>
                {r.note ? <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>Note: {r.note}</div> : null}
                {r.status === "PENDING" ? (
                  <div className="row" style={{ justifyContent: "flex-end", marginTop: 8 }}>
                    <button disabled={loading} onClick={() => approveSubRequest(r.pairingId, r.id)}>Approve</button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ opacity: 0.8 }}>No substitution requests yet.</div>
        )}
      </div>

      <div className="card" style={{ display: "grid", gap: 10 }}>
        <strong>Generate Full Schedule (Round Robin)</strong>
        <div style={{ fontSize: 12, opacity: 0.8 }}>
          Creates DRAFT weeks + matchups + seeded pairings for the season using approved rosters.
        </div>
        <div className="row" style={{ flexWrap: "wrap" }}>
          <button disabled={loading || !seasonId} onClick={() => generateFullSchedule(false)}>Generate</button>
          <button disabled={loading || !seasonId} onClick={() => generateFullSchedule(true)}>Overwrite & Regenerate</button>
        </div>
      </div>

      <div className="card" style={{ display: "grid", gap: 10 }}>
        <strong>Open Week (Admin)</strong>
        <div style={{ fontSize: 12, opacity: 0.8 }}>
          Sets the chosen week to OPEN and locks any currently-open week. (No playing ahead.)
        </div>
        <div className="row">
          <input value={openWeekIndex} onChange={(e) => setOpenWeekIndex(e.target.value)} placeholder="Week to open" />
          <button disabled={loading || !seasonId} onClick={openWeek}>Open</button>
          <button disabled={loading || !seasonId} onClick={loadCurrentWeek}>Refresh</button>
        </div>
        {weekDetail ? (
          <div style={{ fontSize: 12, opacity: 0.85 }}>Current OPEN week: {weekDetail.weekIndex}</div>
        ) : (
          <div style={{ fontSize: 12, opacity: 0.85 }}>Current OPEN week: none</div>
        )}
      </div>

      <div className="card" style={{ display: "grid", gap: 10 }}>
        <strong>Resolve Pairings (Admin)</strong>
        <div style={{ fontSize: 12, opacity: 0.8 }}>
          Force-finalize unconfirmed/disputed pairings so week finalization can proceed.
        </div>

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
          Test single-week generator (pairs teams alphabetically). Prefer "Generate Full Schedule".
        </div>
        <div className="row">
          <input value={weekIndex} onChange={(e) => setWeekIndex(e.target.value)} placeholder="Week index" />
          <button disabled={loading || !seasonId} onClick={generateWeekTest}>Generate & Open</button>
        </div>
      </div>
    </div>
  );
}