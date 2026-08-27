import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { corsHeaders, corsPreflight } from "@/lib/cors";
import { isRegistrationOpen } from "@/lib/registration";
import type { PublicCompetitionListItem } from "@/types";

/**
 * Public competition list — the data behind `/competitions`.
 *
 * `/competitions` is a public page (see the allow-list in `src/middleware.ts`),
 * but `/api/bookings` is not, so an anonymous visitor used to get a 307 to the
 * sign-in page and an empty list. This is the anonymous-safe read.
 *
 * Only confirmed competitions are listed: a PENDING date reservation is still
 * waiting for the admin and a CLUBEVENT is not a competition. Both still show
 * in the WordPress calendar via `/api/public/calendar` — that feed is a
 * date-reservation calendar, this one is the competition catalogue.
 */

const CACHE_CONTROL = "public, s-maxage=60, stale-while-revalidate=300";

export async function GET(req: Request) {
  const errorHeaders = corsHeaders(req);
  const headers = { ...errorHeaders, "Cache-Control": CACHE_CONTROL };

  try {
    const bookings = await prisma.booking.findMany({
      where: { status: "BOOKED" },
      select: {
        id: true,
        startDate: true,
        endDate: true,
        organizerName: true,
        clubName: true,
        location: true,
        competitionType: true,
        status: true,
        regStatus: true,
        regCloseDate: true,
      },
      orderBy: { startDate: "desc" },
    });

    const items: PublicCompetitionListItem[] = bookings.map((b) => ({
      id: b.id,
      startDate: b.startDate.toISOString(),
      endDate: b.endDate.toISOString(),
      organizerName: b.organizerName,
      clubName: b.clubName,
      location: b.location,
      competitionType: b.competitionType,
      status: b.status,
      regStatus: b.regStatus,
      regCloseDate: b.regCloseDate ? b.regCloseDate.toISOString() : null,
      registrationOpen: isRegistrationOpen(b),
    }));

    return NextResponse.json(items, { headers });
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
