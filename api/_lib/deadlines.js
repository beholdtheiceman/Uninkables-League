import { DateTime } from "luxon";

function nextDowDeadline(fromJsDate, zone, targetDow, hour = 23, minute = 59, second = 59) {
  // Luxon: weekday 1=Mon..7=Sun. Spec DOW uses 0=Sun..6=Sat.
  const targetWeekday = targetDow === 0 ? 7 : targetDow;

  const from = DateTime.fromJSDate(fromJsDate, { zone });

  // Start searching same day
  let candidate = from.set({ hour, minute, second, millisecond: 0 });

  // Move forward until weekday matches and candidate is after 'from'
  for (let i = 0; i < 14; i++) {
    if (candidate.weekday === targetWeekday && candidate >= from) return candidate;
    candidate = candidate.plus({ days: 1 }).set({ hour, minute, second, millisecond: 0 });
  }

  // Fallback (should never hit)
  return from.plus({ days: 7 }).set({ hour, minute, second, millisecond: 0 });
}

export function computeWeekDeadlines({ weekOpensAt, timezone, subDeadlineDow, scheduleDeadlineDow, resultsDeadlineDow }) {
  const opensAt = weekOpensAt ?? new Date();
  const zone = timezone || "America/New_York";

  const subDeadline = nextDowDeadline(opensAt, zone, subDeadlineDow);
  const scheduleDeadline = nextDowDeadline(opensAt, zone, scheduleDeadlineDow);
  const resultsDeadline = nextDowDeadline(opensAt, zone, resultsDeadlineDow);

  return {
    zone,
    subDeadlineUtc: subDeadline.toUTC().toJSDate(),
    scheduleDeadlineUtc: scheduleDeadline.toUTC().toJSDate(),
    resultsDeadlineUtc: resultsDeadline.toUTC().toJSDate(),
    subDeadlineIso: subDeadline.toISO(),
    scheduleDeadlineIso: scheduleDeadline.toISO(),
    resultsDeadlineIso: resultsDeadline.toISO()
  };
}

export function isPast(date) {
  return Date.now() > date.getTime();
}