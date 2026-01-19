// Round-robin pairing generator (circle method)
// Returns an array of weeks; each week is an array of [teamAId, teamBId]
export function roundRobinWeeks(teamIds) {
  const teams = [...teamIds];
  if (teams.length < 2) return [];

  // If odd, add BYE placeholder
  const BYE = "__BYE__";
  if (teams.length % 2 === 1) teams.push(BYE);

  const n = teams.length;
  const rounds = n - 1;
  const half = n / 2;

  const arr = [...teams];
  const weeks = [];

  for (let round = 0; round < rounds; round++) {
    const pairs = [];
    for (let i = 0; i < half; i++) {
      const a = arr[i];
      const b = arr[n - 1 - i];
      if (a !== BYE && b !== BYE) {
        // alternate home/away to reduce repeats
        if (round % 2 === 0) pairs.push([a, b]);
        else pairs.push([b, a]);
      }
    }
    weeks.push(pairs);

    // rotate (keep first fixed)
    const fixed = arr[0];
    const rest = arr.slice(1);
    rest.unshift(rest.pop());
    arr.splice(0, arr.length, fixed, ...rest);
  }

  return weeks;
}