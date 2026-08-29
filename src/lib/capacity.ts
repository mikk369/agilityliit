import { prisma } from "./db";

// =========================================================================
// PER-DAY START LIMITS
// =========================================================================

/**
 * The organizer may cap how many entries each competition day takes
 * (`competition_info.max_competitors_per_day`, keyed by day). The cap is kept
 * in one place because three callers have to agree on it: the organizer's
 * editor, the entry form that greys out a full day, and `POST /api/competitors`
 * which is the only one that actually refuses.
 */

/**
 * The day key used by the limits map and by every track date in the app.
 *
 * Dates are stored at UTC midnight and sliced off the ISO string, the same way
 * the track table and the public feed read them, so the three never disagree
 * about which day a track belongs to.
 */
export function toDateKey(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().split("T")[0];
}

/** Every day of a competition, first to last, as day keys. */
export function competitionDates(start: Date | string, end: Date | string): string[] {
  const from = new Date(toDateKey(start));
  const to = new Date(toDateKey(end));
  const dates: string[] = [];
  for (let d = from; d <= to; d.setUTCDate(d.getUTCDate() + 1)) {
    dates.push(toDateKey(d));
  }
  return dates;
}

/**
 * The stored limits as a plain map. The column is JSON written by this app and
 * by the WordPress one, so anything that is not a positive number is treated
 * as "no limit" rather than trusted.
 */
export function readMaxPerDay(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, number> = {};
  for (const [date, max] of Object.entries(value as Record<string, unknown>)) {
    const n = Number(max);
    if (Number.isFinite(n) && n > 0) out[date] = Math.floor(n);
  }
  return out;
}

/**
 * How many entries each day already holds.
 *
 * One entry (a handler with a dog) counts once per day it has a track on, no
 * matter how many tracks that is — the limit is on starters per day, not on
 * runs. Entries still PENDING are counted: they are holding the spot until the
 * organizer decides.
 */
export async function countRegisteredPerDay(
  bookingId: number
): Promise<Record<string, number>> {
  const rows = await prisma.competitorTrack.findMany({
    where: { competitor: { bookingId } },
    select: { competitorId: true, competitionDate: true },
  });

  const seen = new Map<string, Set<number>>();
  for (const row of rows) {
    const key = toDateKey(row.competitionDate);
    const forDay = seen.get(key) ?? new Set<number>();
    forDay.add(row.competitorId);
    seen.set(key, forDay);
  }

  const counts: Record<string, number> = {};
  for (const [date, competitors] of seen) counts[date] = competitors.size;
  return counts;
}

/** Days that cannot take one more entry. */
export function fullDays(
  maxPerDay: Record<string, number>,
  registeredPerDay: Record<string, number>
): string[] {
  return Object.entries(maxPerDay)
    .filter(([date, max]) => (registeredPerDay[date] ?? 0) >= max)
    .map(([date]) => date);
}

export function dayFullError(date: string, max: number): string {
  return `${date} on kohad täis (${max}/${max}). Vali mõni teine päev või võta korraldajaga ühendust.`;
}
