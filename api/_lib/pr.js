function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

// Displayed PR is clamped to the public range (default 100..600).
export function toDisplayedPr(hiddenPr, { min = 100, max = 600 } = {}) {
  return clamp(Math.round(hiddenPr), min, max);
}

// Expected score using compressed Elo curve from PR Change Formula doc.
export function expectedScore(rp, ro) {
  const delta = rp - ro;
  return 1 / (1 + Math.pow(10, -delta / 200));
}

// Actual score S based on best-of-3 match result.
export function actualScore(gamesWonSelf, gamesWonOpp) {
  if (gamesWonSelf === 2 && gamesWonOpp === 0) return 1.0;
  if (gamesWonSelf === 2 && gamesWonOpp === 1) return 0.75;
  if (gamesWonSelf === 1 && gamesWonOpp === 2) return 0.25;
  if (gamesWonSelf === 0 && gamesWonOpp === 2) return 0.0;
  // Fallback for unexpected states; treat as draw-ish.
  return 0.5;
}

// Compute PR delta for player A (player B delta is -deltaA).
// Uses hidden PR values (can exceed display range).
export function computePrDeltaA(hiddenA, hiddenB, gamesWonA, gamesWonB, k = 25) {
  const sA = actualScore(gamesWonA, gamesWonB);
  const eA = expectedScore(hiddenA, hiddenB);
  // Cap is naturally [-k, +k], but rounding could create k+1 on extreme floats; clamp just in case.
  const raw = k * (sA - eA);
  const rounded = Math.round(raw);
  return clamp(rounded, -k, k);
}

