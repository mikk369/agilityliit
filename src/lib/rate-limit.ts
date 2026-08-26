/**
 * A small in-memory rate limiter for the unauthenticated endpoints.
 *
 * Password reset mail is a spam vector pointed at someone else's inbox, so the
 * request endpoint needs a ceiling. This counts per key in a fixed window and
 * lives in the process — good enough for a single server, which is what this
 * app runs on. If it is ever run on several instances, move the counter to the
 * database or Redis; the call sites do not change.
 */

interface Entry {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Entry>();

/** Drop expired entries so the map cannot grow without bound. */
function sweep(now: number) {
  if (buckets.size < 1000) return;
  for (const [key, entry] of buckets) {
    if (entry.resetAt <= now) buckets.delete(key);
  }
}

/**
 * Returns true when the call is allowed, false when the limit is spent.
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  sweep(now);

  const entry = buckets.get(key);

  if (!entry || entry.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) return false;

  entry.count += 1;
  return true;
}

/** Best-effort client address, for keying the limiter. */
export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}
