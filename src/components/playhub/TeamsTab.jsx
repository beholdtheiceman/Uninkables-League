import React, { useEffect, useMemo, useState } from "react";
import { fetchJson } from "../../utils/api.js";

export default function TeamsTab({ seasonId }) {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const [newTeamName, setNewTeamName] = useState("");

  const [rosterTeamId, setRosterTeamId] = useState("");
  const [emails, setEmails] = useState(["", "", "", "", ""]);

  const canUse = Boolean(seasonId);

  async function refresh() {
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
    refresh();
  }, [seasonId]);

  const selectedTeam = useMemo(() => teams.find((t) => t.id === rosterTeamId) || null, [teams, rosterTeamId]);

  async function createTeam() {
    if (!newTeamName.trim()) return;
    setLoading(true);
    setErr(null);
    try {
      await fetchJson(`/api/seasons/${seasonId}/teams`, {
        method: "POST",
        body: JSON.stringify({ name: newTeamName.trim() })
      });
      setNewTeamName("");
      await refresh();
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function submitRoster() {
    if (!selectedTeam) return;
    const slots = emails.map((email, idx) => ({ slotIndex: idx + 1, email: email.trim() })).filter((s) => s.email);
    if (slots.length !== 5) {
      setErr("Enter 5 emails (one per seed slot)");
      return;
    }

    setLoading(true);
    setErr(null);
    try {
      await fetchJson(`/api/seasons/${seasonId}/teams/${selectedTeam.id}/roster/submit`, {
        method: "POST",
        body: JSON.stringify({ slots })
      });
      await refresh();
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (!canUse) return <div className="card">Select a season above to manage teams/rosters.</div>;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="card" style={{ display: "grid", gap: 10 }}>
        <strong>Create Team</strong>
        <div className="row">
          <input value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} placeholder="Team name" />
          <button disabled={loading} onClick={createTeam}>Create</button>
          <button disabled={loading} onClick={refresh}>Refresh</button>
        </div>
        {err ? <div style={{ color: "#ff9aa2" }}>{err}</div> : null}
      </div>

      <div className="card" style={{ display: "grid", gap: 10 }}>
        <strong>Teams</strong>
        {loading ? <div style={{ opacity: 0.8 }}>Loadingâ€¦</div> : null}
        {teams.length ? (
          <div style={{ display: "grid", gap: 8 }}>
            {teams.map((t) => (
              <div key={t.id} className="card" style={{ padding: 12 }}>
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{t.name}</div>
                    <div style={{ fontSize: 12, opacity: 0.8 }}>Captain: {t.captain?.email || t.captainUserId}</div>
                    <div style={{ fontSize: 12, opacity: 0.8 }}>
                      Submitted: {t.rosterSubmittedAt ? "yes" : "no"} â€¢ Approved: {t.rosterApprovedAt ? "yes" : "no"}
                    </div>
                  </div>
                  <button onClick={() => setRosterTeamId(t.id)} className={rosterTeamId === t.id ? "tab tabActive" : "tab"}>
                    Edit roster
                  </button>
                </div>

                {t.rosterSlots?.length ? (
                  <div style={{ marginTop: 8, fontSize: 12, opacity: 0.9 }}>
                    {t.rosterSlots.map((s) => (
                      <div key={s.id}>Seed {s.slotIndex}: {s.user?.email || s.userId} (PR submit {s.mmrAtSubmit}, PR lock {s.mmrAtLock ?? "—"})</div>
                    ))}
                  </div>
                ) : (
                  <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>No roster submitted yet.</div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ opacity: 0.8 }}>No teams yet.</div>
        )}
      </div>

      {selectedTeam ? (
        <div className="card" style={{ display: "grid", gap: 10 }}>
          <strong>Submit Roster â€” {selectedTeam.name}</strong>
          <div style={{ fontSize: 12, opacity: 0.8 }}>Enter 5 registered user emails (Seed 1..5). Then submit for approval.</div>
          <div style={{ display: "grid", gap: 8 }}>
            {emails.map((v, i) => (
              <input
                key={i}
                value={v}
                placeholder={`Seed ${i + 1} email`}
                onChange={(e) => {
                  const next = [...emails];
                  next[i] = e.target.value;
                  setEmails(next);
                }}
              />
            ))}
          </div>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <button disabled={loading} onClick={submitRoster}>Submit roster</button>
            <button onClick={() => setRosterTeamId("")}>Close</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}