import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { corsHeaders, corsPreflight } from "@/lib/cors";
import { isRegistrationOpen } from "@/lib/registration";
import type { CalendarEvent } from "@/types";

/**
 * Public competition calendar feed.
 *
 * Read by the WordPress calendar on agilityliit.ee — this app has no calendar
 * page of its own. Anonymous, cross-origin and cached, so it must stay free of
 * personal data: the `select` below is the allow-list, keep it that way.
 *
 *   GET /api/public/calendar
 *   GET /api/public/calendar?year=2026
 */

const CACHE_CONTROL = "public, s-maxage=300, stale-while-revalidate=600";

/**
 * Absolute base URL for links handed to the WordPress calendar. Set
 * `PUBLIC_APP_URL` in production; `NEXTAUTH_URL` is the sensible fallback
 * since it is already the app's canonical origin.
 */
function publicAppUrl(): string {
  const url = process.env.PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "";
  return url.replace(/\/$/, "");
}

/** The DB column is JSON and has held a string, an array or null over the years. */
function toRefereeArray(referee: unknown): string[] {
  if (Array.isArray(referee)) return referee.filter((r): r is string => typeof r === "string");
  if (typeof referee === "string" && referee) return [referee];
  return [];
}

export async function GET(req: Request) {
  // Errors carry CORS headers but never the cache header — a cached 500 would
  // keep the WP calendar empty for the whole TTL.
  const errorHeaders = corsHeaders(req);
  const headers = { ...errorHeaders, "Cache-Control": CACHE_CONTROL };

  try {
    const yearParam = new URL(req.url).searchParams.get("year");
    let dateFilter = {};

    if (yearParam) {
      const year = Number(yearParam);
      if (!Number.isInteger(year) || year < 2000 || year > 2100) {
        return NextResponse.json(
          { error: "Vigane aasta" },
          { status: 400, headers: errorHeaders }
        );
      }
      // Any competition overlapping the year, not just those starting in it.
      dateFilter = {
        startDate: { lte: new Date(Date.UTC(year, 11, 31, 23, 59, 59)) },
        endDate: { gte: new Date(Date.UTC(year, 0, 1)) },
      };
    }

    const bookings = await prisma.booking.findMany({
      where: {
        status: { in: ["BOOKED", "PENDING", "CLUBEVENT"] },
        ...dateFilter,
      },
      select: {
        id: true,
        startDate: true,
        endDate: true,
        organizerName: true,
        clubName: true,
        location: true,
        competitionType: true,
        competitionClasses: true,
        referee: true,
        info: true,
        status: true,
        regStatus: true,
        regCloseDate: true,
      },
      orderBy: { startDate: "desc" },
    });

    const baseUrl = publicAppUrl();

    const events: CalendarEvent[] = bookings.map((b) => ({
      id: b.id,
      clubName: b.clubName,
      organizerName: b.organizerName,
      start: b.startDate.toISOString(),
      end: b.endDate.toISOString(),
      referee: toRefereeArray(b.referee),
      competitionClasses: b.competitionClasses || "",
      competitionType: b.competitionType,
      description: b.info || "",
      location: b.location,
      regStatus: b.regStatus,
      regCloseDate: b.regCloseDate ? b.regCloseDate.toISOString() : null,
      registrationOpen: isRegistrationOpen(b),
      status: b.status,
      // The public competition page, not the protected registration form —
      // it works for anonymous visitors and links onward to registration.
      url: `${baseUrl}/competitions/${b.id}`,
    }));

    return NextResponse.json(events, { headers });
  } catch {
    return NextResponse.json(
      { error: "Serveri viga" },
      { status: 500, headers: errorHeaders }
    );
  }
}

export async function OPTIONS(req: Request) {
  return corsPreflight(req);
}
