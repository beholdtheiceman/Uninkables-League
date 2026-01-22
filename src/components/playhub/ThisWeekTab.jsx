import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../contexts/AuthContext.jsx";
import { fetchJson } from "../../utils/api.js";

function formatLocal(dt) {
  if (!dt) return "";
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function ThisWeekTab({ seasonId }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const [currentWeek, setCurrentWeek] = useState(null);
  const [weekDetail, setWeekDetail] = useState(null);

  const [scheduleValue, setScheduleValue] = useState({});

  async function refresh() {
    if (!seasonId) return;
    setLoading(true);
    setErr(null);
    try {
      const cur = await fetchJson(`/api/seasons/${seasonId}/weeks/current`);
      setCurrentWeek(cur.week);
      if (cur.week?.weekIndex) {
        const wd = await fetchJson(`/api/seasons/${seasonId}/weeks/${cur.week.weekIndex}`);
        setWeekDetail(wd.week);
      } else {
        setWeekDetail(null);
      }
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, [seasonId]);

  const myPairings = useMemo(() => {
    const me = user?.email;
    if (!me) return [];
    const matchups = weekDetail?.matchups || [];
    const out = [];
    for (const m of matchups) {
      for (const p of m.pairings || []) {
        if (p.playerA?.email === me || p.playerB?.email === me) {
          out.push({ matchup: m, pairing: p });
        }
      }
    }
    return out;
  }, [weekDetail, user]);

  async function schedule(pairingId) {
    const val = scheduleValue[pairingId];
    if (!val) return;
    setLoading(true);
    setErr(null);
    try {
      await fetchJson(`/api/pairings/${pairingId}/schedule`, {
        method: "POST",
        body: JSON.stringify({ scheduledFor: new Date(val).toISOString() })
      });
      await refresh();
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function confirmSchedule(pairingId) {
    setLoading(true);
    setErr(null);
    try {
      await fetchJson(`/api/pairings/${pairingId}/schedule`, {
        method: "POST",
        body: JSON.stringify({ confirm: true })
      });
      await refresh();
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function report(pairingId, score) {
    setLoading(true);
    setErr(null);
    try {
      await fetchJson(`/api/pairings/${pairingId}/report`, {
        method: "POST",
        body: JSON.stringify(score)
      });
      await refresh();
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function confirmResult(pairingId) {
    setLoading(true);
    setErr(null);
    try {
      await fetchJson(`/api/pairings/${pairingId}/confirm`, { method: "POST" });
      await refresh();
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function dispute(pairingId) {
    setLoading(true);
    setErr(null);
    try {
      await fetchJson(`/api/pairings/${pairingId}/dispute`, { method: "POST", body: JSON.stringify({ note: "disputed" }) });
      await refresh();
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (!seasonId) return <div className="card">Select a season above to view this week.</div>;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="card" style={{ display: "grid", gap: 10 }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <strong>This Week</strong>
          <button disabled={loading} onClick={refresh}>Refresh</button>
        </div>
        {err ? <div style={{ color: "#ff9aa2" }}>{err}</div> : null}
        {!currentWeek ? (
          <div style={{ opacity: 0.8 }}>No OPEN week yet. (Admin: generate and open a week.)</div>
        ) : (
          <div style={{ opacity: 0.85 }}>Week {currentWeek.weekIndex} â€¢ State: {currentWeek.state}</div>
        )}
      </div>

      <div className="card" style={{ display: "grid", gap: 10 }}>
        <strong>My Pairings</strong>
        {!user ? <div style={{ opacity: 0.8 }}>Login to see your pairings.</div> : null}
        {user && !myPairings.length ? <div style={{ opacity: 0.8 }}>No pairings found for {user.email}.</div> : null}

        {myPairings.map(({ matchup, pairing }) => (
          <div key={pairing.id} className="card" style={{ padding: 12 }}>
            <div style={{ fontWeight: 700 }}>
              {matchup.teamA?.name} vs {matchup.teamB?.name} â€” Seed {pairing.seedIndex}
            </div>
            <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>
              {pairing.playerA?.email} (PR {pairing.mmrAAtCreate}) vs {pairing.playerB?.email} (PR {pairing.mmrBAtCreate})
            </div>
            <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>
              State: {pairing.state} â€¢ Scheduled: {pairing.scheduledFor ? new Date(pairing.scheduledFor).toLocaleString() : "â€”"}
            </div>

            <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
              <div className="row">
                <input
                  type="datetime-local"
                  value={scheduleValue[pairing.id] ?? formatLocal(pairing.scheduledFor)}
                  onChange={(e) => setScheduleValue((s) => ({ ...s, [pairing.id]: e.target.value }))}
                />
                <button disabled={loading} onClick={() => schedule(pairing.id)}>Propose</button>
                <button disabled={loading} onClick={() => confirmSchedule(pairing.id)}>Confirm</button>
              </div>

              <div className="row" style={{ flexWrap: "wrap" }}>
                <button disabled={loading} onClick={() => report(pairing.id, { gamesWonA: 2, gamesWonB: 0 })}>Report 2-0 A</button>
                <button disabled={loading} onClick={() => report(pairing.id, { gamesWonA: 2, gamesWonB: 1 })}>Report 2-1 A</button>
                <button disabled={loading} onClick={() => report(pairing.id, { gamesWonA: 0, gamesWonB: 2 })}>Report 0-2 A</button>
                <button disabled={loading} onClick={() => report(pairing.id, { gamesWonA: 1, gamesWonB: 2 })}>Report 1-2 A</button>
              </div>

              <div className="row" style={{ justifyContent: "space-between" }}>
                <button disabled={loading} onClick={() => confirmResult(pairing.id)}>Confirm result</button>
                <button disabled={loading} onClick={() => dispute(pairing.id)}>Dispute</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}