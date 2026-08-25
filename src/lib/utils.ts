/**
 * Format a date string for display.
 * With locale: uses locale-appropriate format (et-EE or en-GB).
 * Without locale: defaults to et-EE.
 */
export function formatDate(dateStr: string, locale?: string): string {
  const loc = locale === "en" ? "en-GB" : "et-EE";
  return new Date(dateStr).toLocaleDateString(loc);
}

/**
 * Sort competition results: DNS/DSQ last, then by time ascending, then fewer faults.
 */
export function sortResults<
  T extends { isDns: boolean; isDsq: boolean; timeSeconds: number | null; faults: number }
>(competitors: T[]): T[] {
  return [...competitors].sort((a, b) => {
    if (a.isDns || a.isDsq) {
      if (b.isDns || b.isDsq) return 0;
      return 1;
    }
    if (b.isDns || b.isDsq) return -1;

    const timeA = a.timeSeconds ?? Infinity;
    const timeB = b.timeSeconds ?? Infinity;
    if (timeA !== timeB) return timeA - timeB;

    return a.faults - b.faults;
  });
}
