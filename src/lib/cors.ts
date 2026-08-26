/**
 * CORS for the public API the WordPress site (agilityliit.ee) reads.
 *
 * The calendar lives on the WP site while its data lives here, so those
 * requests are cross-origin. Only the federation's own origins are allowed —
 * never `*`, so that adding credentials later cannot silently open it up.
 */

const DEFAULT_ALLOWED_ORIGINS = [
  "https://agilityliit.ee",
  "https://www.agilityliit.ee",
];

/** Origins allowed to read the public API. Override with `PUBLIC_ALLOWED_ORIGINS` (comma-separated). */
export function allowedOrigins(): string[] {
  const configured = process.env.PUBLIC_ALLOWED_ORIGINS;
  if (!configured) return DEFAULT_ALLOWED_ORIGINS;
  return configured
    .split(",")
    .map((o) => o.trim().replace(/\/$/, ""))
    .filter(Boolean);
}

/**
 * Headers to attach to a public API response.
 * An unknown or absent `Origin` gets no allow header — the request still
 * succeeds (server-to-server callers do not care), the browser just blocks it.
 */
export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin");
  const headers: Record<string, string> = { Vary: "Origin" };

  if (origin && allowedOrigins().includes(origin.replace(/\/$/, ""))) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  return headers;
}

/** Preflight response for a public API route. */
export function corsPreflight(req: Request): Response {
  return new Response(null, {
    status: 204,
    headers: {
      ...corsHeaders(req),
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
}
