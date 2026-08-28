import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { corsHeaders, corsPreflight } from "@/lib/cors";
import { isRegistrationOpen } from "@/lib/registration";
import type { PublicCompetitionDetail } from "@/types";

/**
 * Public competition detail — the data behind `/competitions/[id]`.
 *
 * This is where the WordPress calendar sends every click, including clicks on
 * a competition that is still PENDING or whose registration is closed, so it
 * must answer anonymously for any booking that exists. It is `/api/bookings/[id]`
 * minus the fields no visitor needs: `userId` and the internal `qualTime`.
 *
 * `email` and `phone` are the contact details the organizer fills in expressly
 * to be published with the competition (they are required by `bookingSchema`),
 * so they stay — drop them from the `select` below if that ever changes.
 */

const CACHE_CONTROL = "public, s-maxage=60, stale-while-revalidate=300";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const errorHeaders = corsHeaders(req);
  const headers = { ...errorHeaders, "Cache-Control": CACHE_CONTROL };

  try {
    const { id } = await params;
    const bookingId = parseInt(id);
    if (!Number.isInteger(bookingId)) {
      return NextResponse.json(
        { error: "Vigane võistluse number" },
        { status: 400, headers: errorHeaders }
      );
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        startDate: true,
        endDate: true,
        organizerName: true,
        clubName: true,
        email: true,
        phone: true,
        location: true,
        competitionOfficiality: true,
        competitionClasses: true,
        referee: true,
        info: true,
        status: true,
        regStatus: true,
        regCloseDate: true,
        competitionInfo: {
          select: { descriptionEst: true, descriptionEng: true },
        },
        competitionTracks: {
          orderBy: [{ competitionDate: "asc" }, { sortOrder: "asc" }],
          select: {
            id: true,
            competitionDate: true,
            letter: true,
            trackType: true,
            size: true,
            officiality: true,
            referee: true,
            isRelay: true,
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: "Võistlust ei leitud" },
        { status: 404, headers: errorHeaders }
      );
    }

    const detail: PublicCompetitionDetail = {
      id: booking.id,
      startDate: booking.startDate.toISOString(),
      endDate: booking.endDate.toISOString(),
      organizerName: booking.organizerName,
      clubName: booking.clubName,
      email: booking.email,
      phone: booking.phone,
      location: booking.location,
      competitionOfficiality: booking.competitionOfficiality,
      competitionClasses: booking.competitionClasses,
      referee: toRefereeArray(booking.referee),
      info: booking.info,
      status: booking.status,
      regStatus: booking.regStatus,
      regCloseDate: booking.regCloseDate
        ? booking.regCloseDate.toISOString()
        : null,
      registrationOpen: isRegistrationOpen(booking),
      competitionInfo: booking.competitionInfo,
      competitionTracks: booking.competitionTracks.map((t) => ({
        ...t,
        competitionDate: t.competitionDate.toISOString(),
      })),
    };

    return NextResponse.json(detail, { headers });
  } catch {
    return NextResponse.json(
      { error: "Serveri viga" },
      { status: 500, headers: errorHeaders }
    );
  }
}

/** The DB column is JSON and has held a string, an array or null over the years. */
function toRefereeArray(referee: unknown): string[] {
  if (Array.isArray(referee))
    return referee.filter((r): r is string => typeof r === "string");
  if (typeof referee === "string" && referee) return [referee];
  return [];
}

export async function OPTIONS(req: Request) {
  return corsPreflight(req);
}
