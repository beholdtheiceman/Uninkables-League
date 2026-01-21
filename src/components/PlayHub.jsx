import React, { useEffect, useMemo, useState } from "react";
import StandingsTab from "./playhub/StandingsTab.jsx";
import ThisWeekTab from "./playhub/ThisWeekTab.jsx";
import TeamsTab from "./playhub/TeamsTab.jsx";
import AdminTab from "./playhub/AdminTab.jsx";
import { useAuth } from "../contexts/AuthContext.jsx";
import { fetchJson } from "../utils/api.js";

function useStickyState(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // ignore
    }
  }, [key, value]);

  return [value, setValue];
}

export default function PlayHub({
  tab,
  onTabChange,
  hideTabs = false,
  fixedSeasonId = null,
  hideSeasonSelector = false
}) {
  const { user } = useAuth();

  const [seasonId, setSeasonId] = useStickyState("playhub.seasonId", "");

  const [leagueDetail, setLeagueDetail] = useState(null);
  const [leagueDetailVersion, setLeagueDetailVersion] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr(null);
    fetchJson("/api/league")
      .then((d) => alive && setLeagueDetail(d.league))
      .catch((e) => alive && setErr(e.message))
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr(null);
    fetchJson("/api/league")
      .then((d) => alive && setLeagueDetail(d.league))
      .catch((e) => alive && setErr(e.message))
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
  }, [leagueDetailVersion]);

  const refreshLeagueDetail = () => setLeagueDetailVersion((v) => v + 1);

  const onSeasonCreated = (season) => {
    if (!season?.id) return;
    setLeagueDetail((prev) => {
      if (!prev) return prev;
      const existing = prev.seasons || [];
      if (existing.some((s) => s.id === season.id)) return prev;
      return { ...prev, seasons: [season, ...existing] };
    });
  };

  const onSeasonDeleted = (deletedSeasonId) => {
    if (!deletedSeasonId) return;
    setLeagueDetail((prev) => {
      if (!prev) return prev;
      const existing = prev.seasons || [];
      if (!existing.length) return prev;
      return { ...prev, seasons: existing.filter((s) => s.id !== deletedSeasonId) };
    });
  };

  // keep seasonId valid for selected league
  useEffect(() => {
    if (!leagueDetail) return;
    const seasons = leagueDetail.seasons || [];
    if (!seasons.length) {
      setSeasonId("");
      return;
    }
    if (fixedSeasonId && seasons.some((s) => s.id === fixedSeasonId)) {
      setSeasonId(fixedSeasonId);
      return;
    }
    if (seasonId && seasons.some((s) => s.id === seasonId)) return;
    setSeasonId(leagueDetail.currentSeasonId || seasons[0].id);
  }, [leagueDetail]);

  const tabs = useMemo(() => {
    const ctx = { leagueId: leagueDetail?.id || null, seasonId: fixedSeasonId || seasonId };
    const base = [
      { key: "standings", label: "Standings", el: <StandingsTab {...ctx} /> },
      { key: "thisweek", label: "This Week", el: <ThisWeekTab {...ctx} /> },
      { key: "teams", label: "Teams", el: <TeamsTab {...ctx} /> }
    ];
    if (user) {
      base.push({
        key: "admin",
        label: "Admin",
        el: (
          <AdminTab
            {...ctx}
            onDataChanged={refreshLeagueDetail}
            onSeasonCreated={onSeasonCreated}
            onSeasonDeleted={onSeasonDeleted}
            onSeasonChanged={setSeasonId}
          />
        )
      });
    }
    return base;
  }, [user, seasonId, fixedSeasonId, leagueDetail?.id]);

  const [active, setActive] = useState(tab || "standings");
  useEffect(() => {
    if (!tab) return;
    setActive(tab);
  }, [tab]);

  const seasons = leagueDetail?.seasons || [];
  const effectiveSeasonId = fixedSeasonId || seasonId;
  const selectedSeasonName =
    seasons.find((s) => s.id === effectiveSeasonId)?.name || null;

  return (
    <div className="card" style={{ display: "grid", gap: 10 }}>
      {!leagueDetail && !loading && !err ? (
        <div className="card" style={{ color: "#ff9aa2" }}>
          The site isn’t initialized yet (no league record found in the database).
        </div>
      ) : null}

      <div className="row" style={{ gap: 12, flexWrap: "wrap" }}>
        <div style={{ minWidth: 260, flex: 1 }}>
          <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>Season</div>
          {hideSeasonSelector || Boolean(fixedSeasonId) ? (
            <div
              className="card"
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.14)"
              }}
              title={selectedSeasonName || undefined}
            >
              {selectedSeasonName || "Current Season"}
            </div>
          ) : (
            <select
              value={seasonId}
              disabled={!seasons.length}
              onChange={(e) => setSeasonId(e.target.value)}
              style={{
                width: "100%",
                padding: 10,
                borderRadius: 10,
                background: "rgba(255,255,255,0.06)",
                color: "#e6e9f2",
                border: "1px solid rgba(255,255,255,0.14)"
              }}
            >
              <option value="">Select a season…</option>
              {seasons.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.phase})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {loading ? <div style={{ opacity: 0.8 }}>Loading…</div> : null}
      {err ? <div style={{ color: "#ff9aa2" }}>{err}</div> : null}

      {!hideTabs ? (
        <div className="tabs" style={{ marginTop: 4 }}>
          {tabs.map((t) => (
            <button
              key={t.key}
              className={active === t.key ? "tab tabActive" : "tab"}
              onClick={() => {
                setActive(t.key);
                onTabChange?.(t.key);
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      ) : null}

      <div style={{ marginTop: 4 }}>{tabs.find((t) => t.key === active)?.el}</div>
    </div>
  );
}