import React, { useMemo, useState } from "react";

const SIZE_BUCKETS = [
  { value: "8", label: "8 players" },
  { value: "9-16", label: "9–16 players" },
  { value: "17-32", label: "17–32 players" },
  { value: "33-64", label: "33–64 players" },
  { value: "65-128", label: "65–128 players" },
  { value: "129-256", label: "129–256 players" },
  { value: "257-512", label: "257–512 players" },
  { value: "513-1024", label: "513–1,024 players" },
  { value: "1025-2048", label: "1,025–2,048 players" }
];

const PLACEMENTS_BY_BUCKET = {
  "8": [
    { value: "1st", label: "1st" },
    { value: "2nd-8th", label: "2nd–8th" }
  ],
  "9-16": [
    { value: "1st", label: "1st" },
    { value: "2nd", label: "2nd" },
    { value: "3rd-4th", label: "3rd–4th" },
    { value: "5th-8th", label: "5th–8th" },
    { value: "9th+", label: "9th+" }
  ],
  "17-32": [
    { value: "1st", label: "1st" },
    { value: "2nd", label: "2nd" },
    { value: "3rd-4th", label: "3rd–4th" },
    { value: "5th-8th", label: "5th–8th" },
    { value: "9th-16th", label: "9th–16th" },
    { value: "17th+", label: "17th+" }
  ],
  "33-64": [
    { value: "1st", label: "1st" },
    { value: "2nd", label: "2nd" },
    { value: "3rd-4th", label: "3rd–4th" },
    { value: "5th-8th", label: "5th–8th" },
    { value: "9th-16th", label: "9th–16th" },
    { value: "17th-32nd", label: "17th–32nd" },
    { value: "33rd+", label: "33rd+" }
  ],
  "65-128": [
    { value: "1st", label: "1st" },
    { value: "2nd", label: "2nd" },
    { value: "3rd-4th", label: "3rd–4th" },
    { value: "5th-8th", label: "5th–8th" },
    { value: "9th-16th", label: "9th–16th" },
    { value: "17th-32nd", label: "17th–32nd" },
    { value: "33rd-64th", label: "33rd–64th" },
    { value: "65th+", label: "65th+" }
  ],
  "129-256": [
    { value: "1st", label: "1st" },
    { value: "2nd", label: "2nd" },
    { value: "3rd-4th", label: "3rd–4th" },
    { value: "5th-8th", label: "5th–8th" },
    { value: "9th-16th", label: "9th–16th" },
    { value: "17th-32nd", label: "17th–32nd" },
    { value: "33rd-64th", label: "33rd–64th" },
    { value: "65th-128th", label: "65th–128th" },
    { value: "129th+", label: "129th+" }
  ],
  "257-512": [
    { value: "1st", label: "1st" },
    { value: "2nd", label: "2nd" },
    { value: "3rd-4th", label: "3rd–4th" },
    { value: "5th-8th", label: "5th–8th" },
    { value: "9th-16th", label: "9th–16th" },
    { value: "17th-32nd", label: "17th–32nd" },
    { value: "33rd-64th", label: "33rd–64th" },
    { value: "65th-128th", label: "65th–128th" },
    { value: "129th-256th", label: "129th–256th" },
    { value: "257th+", label: "257th+" }
  ],
  "513-1024": [
    { value: "1st", label: "1st" },
    { value: "2nd", label: "2nd" },
    { value: "3rd-4th", label: "3rd–4th" },
    { value: "5th-8th", label: "5th–8th" },
    { value: "9th-16th", label: "9th–16th" },
    { value: "17th-32nd", label: "17th–32nd" },
    { value: "33rd-64th", label: "33rd–64th" },
    { value: "65th-128th", label: "65th–128th" },
    { value: "129th-256th", label: "129th–256th" },
    { value: "257th-512th", label: "257th–512th" },
    { value: "513th+", label: "513th+" }
  ],
  "1025-2048": [
    { value: "1st", label: "1st" },
    { value: "2nd", label: "2nd" },
    { value: "3rd-4th", label: "3rd–4th" },
    { value: "5th-8th", label: "5th–8th" },
    { value: "9th-16th", label: "9th–16th" },
    { value: "17th-32nd", label: "17th–32nd" },
    { value: "33rd-64th", label: "33rd–64th" },
    { value: "65th-128th", label: "65th–128th" },
    { value: "129th-256th", label: "129th–256th" },
    { value: "257th-512th", label: "257th–512th" },
    { value: "513th-1024th", label: "513th–1,024th" },
    { value: "1025th+", label: "1,025th+" }
  ]
};

// Initial PR points table from "Player Rating System" doc.
const POINTS = {
  "8": { "1st": 30, "2nd-8th": 5 },
  "9-16": { "1st": 60, "2nd": 50, "3rd-4th": 40, "5th-8th": 20, "9th+": 10 },
  "17-32": { "1st": 80, "2nd": 70, "3rd-4th": 60, "5th-8th": 50, "9th-16th": 20, "17th+": 10 },
  "33-64": { "1st": 90, "2nd": 80, "3rd-4th": 70, "5th-8th": 60, "9th-16th": 30, "17th-32nd": 20, "33rd+": 10 },
  "65-128": { "1st": 100, "2nd": 90, "3rd-4th": 80, "5th-8th": 70, "9th-16th": 50, "17th-32nd": 40, "33rd-64th": 20, "65th+": 10 },
  "129-256": { "1st": 110, "2nd": 100, "3rd-4th": 90, "5th-8th": 80, "9th-16th": 60, "17th-32nd": 50, "33rd-64th": 25, "65th-128th": 20, "129th+": 10 },
  "257-512": { "1st": 130, "2nd": 120, "3rd-4th": 110, "5th-8th": 100, "9th-16th": 80, "17th-32nd": 60, "33rd-64th": 30, "65th-128th": 25, "129th-256th": 15, "257th+": 10 },
  "513-1024": { "1st": 140, "2nd": 130, "3rd-4th": 120, "5th-8th": 110, "9th-16th": 90, "17th-32nd": 70, "33rd-64th": 35, "65th-128th": 25, "129th-256th": 15, "257th-512th": 10, "513th+": 5 },
  "1025-2048": { "1st": 170, "2nd": 160, "3rd-4th": 150, "5th-8th": 140, "9th-16th": 130, "17th-32nd": 110, "33rd-64th": 55, "65th-128th": 40, "129th-256th": 35, "257th-512th": 20, "513th-1024th": 15, "1025th+": 10 }
};

function displayedPr(hidden) {
  return Math.max(100, Math.min(600, Math.round(hidden)));
}

function pointsFor(bucket, placement) {
  if (!bucket || !placement) return 0;
  return POINTS[bucket]?.[placement] ?? 0;
}

function Row({ row, onChange, onRemove, showName }) {
  const placements = PLACEMENTS_BY_BUCKET[row.sizeBucket] || [];
  return (
    <div className="row" style={{ gap: 10, flexWrap: "wrap", alignItems: "end" }}>
      {showName ? (
        <div style={{ minWidth: 220, flex: 1 }}>
          <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>Tournament</div>
          <input value={row.name} onChange={(e) => onChange({ ...row, name: e.target.value })} placeholder="Tournament name" />
        </div>
      ) : null}
      <div style={{ minWidth: 180 }}>
        <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>Size</div>
        <select value={row.sizeBucket} onChange={(e) => onChange({ ...row, sizeBucket: e.target.value, placement: "" })}>
          <option value="">Select size…</option>
          {SIZE_BUCKETS.map((b) => (
            <option key={b.value} value={b.value}>
              {b.label}
            </option>
          ))}
        </select>
      </div>
      <div style={{ minWidth: 180 }}>
        <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>Finish</div>
        <select value={row.placement} onChange={(e) => onChange({ ...row, placement: e.target.value })} disabled={!row.sizeBucket}>
          <option value="">Select finish…</option>
          {placements.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>
      <div style={{ minWidth: 80 }}>
        <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>PR</div>
        <div style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)" }}>
          {pointsFor(row.sizeBucket, row.placement)}
        </div>
      </div>
      <button type="button" onClick={onRemove} style={{ opacity: 0.9 }}>
        Remove
      </button>
    </div>
  );
}

export default function PrCalculatorPage() {
  const [set10, setSet10] = useState([
    { id: "s10-1", sizeBucket: "", placement: "" },
    { id: "s10-2", sizeBucket: "", placement: "" },
    { id: "s10-3", sizeBucket: "", placement: "" }
  ]);
  const [set9, setSet9] = useState([
    { id: "s9-1", sizeBucket: "", placement: "" },
    { id: "s9-2", sizeBucket: "", placement: "" },
    { id: "s9-3", sizeBucket: "", placement: "" }
  ]);
  const [others, setOthers] = useState([]);

  const totalHidden = useMemo(() => {
    const all = [...set10, ...set9, ...others];
    return all.reduce((sum, r) => sum + pointsFor(r.sizeBucket, r.placement), 0);
  }, [set10, set9, others]);

  const totalDisplayed = useMemo(() => displayedPr(totalHidden), [totalHidden]);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="card">
        <div style={{ fontSize: 20, fontWeight: 800 }}>PR Calculator (Initial Player Rating)</div>
        <div style={{ opacity: 0.8, marginTop: 6 }}>
          Enter your Set Champs finishes and other tournament results to compute your initial PR. Displayed PR is clamped to 100–600.
        </div>
      </div>

      <div className="card" style={{ display: "grid", gap: 12 }}>
        <strong>Whispers in the Well Set Champs (Set 10) — top 3 finishes</strong>
        {set10.map((r, idx) => (
          <Row
            key={r.id}
            row={r}
            showName={false}
            onChange={(next) => setSet10((prev) => prev.map((x, i) => (i === idx ? next : x)))}
            onRemove={() => setSet10((prev) => prev.map((x, i) => (i === idx ? { ...x, sizeBucket: "", placement: "" } : x)))}
          />
        ))}
      </div>

      <div className="card" style={{ display: "grid", gap: 12 }}>
        <strong>Fabled Set Champs (Set 9) — top 3 finishes</strong>
        {set9.map((r, idx) => (
          <Row
            key={r.id}
            row={r}
            showName={false}
            onChange={(next) => setSet9((prev) => prev.map((x, i) => (i === idx ? next : x)))}
            onRemove={() => setSet9((prev) => prev.map((x, i) => (i === idx ? { ...x, sizeBucket: "", placement: "" } : x)))}
          />
        ))}
      </div>

      <div className="card" style={{ display: "grid", gap: 12 }}>
        <strong>Other Constructed Tournaments (Sets 9–10)</strong>
        <div style={{ fontSize: 12, opacity: 0.8 }}>Add any non-Set-Champs tournaments you played. Each entry adds PR per the table.</div>
        {others.length ? (
          <div style={{ display: "grid", gap: 10 }}>
            {others.map((r, idx) => (
              <Row
                key={r.id}
                row={r}
                showName={true}
                onChange={(next) => setOthers((prev) => prev.map((x, i) => (i === idx ? next : x)))}
                onRemove={() => setOthers((prev) => prev.filter((x) => x.id !== r.id))}
              />
            ))}
          </div>
        ) : (
          <div style={{ opacity: 0.8 }}>No extra tournaments added.</div>
        )}
        <button
          type="button"
          onClick={() => setOthers((prev) => [...prev, { id: `o-${Date.now()}`, name: "", sizeBucket: "", placement: "" }])}
        >
          Add tournament
        </button>
      </div>

      <div className="card" style={{ display: "grid", gap: 10 }}>
        <strong>Result</strong>
        <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>Hidden PR (internal)</div>
            <div style={{ fontSize: 26, fontWeight: 900 }}>{Math.round(totalHidden)}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>Displayed PR</div>
            <div style={{ fontSize: 26, fontWeight: 900 }}>{totalDisplayed}</div>
          </div>
        </div>
        <div style={{ fontSize: 12, opacity: 0.8 }}>
          Note: ratings may go below 100 or above 600 internally, but are clamped for display and roster rules.
        </div>
      </div>
    </div>
  );
}

