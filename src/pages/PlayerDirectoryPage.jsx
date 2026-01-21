import React, { useMemo, useState } from "react";

export default function PlayerDirectoryPage() {
  const [q, setQ] = useState("");

  const placeholder = useMemo(() => {
    return q
      ? `No results for "${q}". Hook this up to your player DB when ready.`
      : "Search players by name/email once connected to your league database.";
  }, [q]);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="card">
        <div style={{ fontSize: 20, fontWeight: 800 }}>Player Directory</div>
        <div style={{ opacity: 0.75, marginTop: 6 }}>
          Lorcana league player lookup (captains, rosters, division participation).
        </div>
      </div>

      <div className="card" style={{ display: "grid", gap: 10 }}>
        <strong>Search</strong>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name or email…"
        />
        <div style={{ opacity: 0.85 }}>{placeholder}</div>
      </div>
    </div>
  );
}

