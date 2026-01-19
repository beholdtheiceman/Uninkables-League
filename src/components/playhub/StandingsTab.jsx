import React, { useEffect, useState } from "react";
import { fetchJson } from "../../utils/api.js";

export default function StandingsTab({ seasonId }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);

  async function refresh() {
    if (!seasonId) return;
    setLoading(true);
    setErr(null);
    try {
      const d = await fetchJson(`/api/seasons/${seasonId}/standings`);
      setTeams(d.teamStandings || []);
      setPlayers(d.playerStandings || []);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, [seasonId]);

  if (!seasonId) return <div className="card">Select a season above to view standings.</div>;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="card" style={{ display: "grid", gap: 10 }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <strong>Standings</strong>
          <button disabled={loading} onClick={refresh}>Refresh</button>
        </div>
        {err ? <div style={{ color: "#ff9aa2" }}>{err}</div> : null}
      </div>

      <div className="card" style={{ display: "grid", gap: 10 }}>
        <strong>Team Standings</strong>
        {loading ? <div style={{ opacity: 0.8 }}>Loadingâ€¦</div> : null}
        {teams.length ? (
          <div style={{ display: "grid", gap: 6 }}>
            {teams.map((t, idx) => (
              <div key={t.teamId} className="row" style={{ justifyContent: "space-between" }}>
                <div>
                  <span style={{ opacity: 0.75, marginRight: 8 }}>#{idx + 1}</span>
                  <strong>{t.name}</strong>
                  <span style={{ opacity: 0.75, marginLeft: 8, fontSize: 12 }}>({t.captainEmail || "â€”"})</span>
                </div>
                <div style={{ fontVariantNumeric: "tabular-nums" }}>{t.points}</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ opacity: 0.8 }}>No team points yet.</div>
        )}
      </div>

      <div className="card" style={{ display: "grid", gap: 10 }}>
        <strong>Player Standings</strong>
        {players.length ? (
          <div style={{ display: "grid", gap: 6 }}>
            {players.map((p, idx) => (
              <div key={p.userId} className="row" style={{ justifyContent: "space-between" }}>
                <div>
                  <span style={{ opacity: 0.75, marginRight: 8 }}>#{idx + 1}</span>
                  <span>{p.email || p.userId}</span>
                </div>
                <div style={{ fontVariantNumeric: "tabular-nums" }}>{p.points}</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ opacity: 0.8 }}>No player points yet.</div>
        )}
      </div>
    </div>
  );
}