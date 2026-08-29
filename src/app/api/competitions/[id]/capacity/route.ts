import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import {
  competitionDates,
  countRegisteredPerDay,
  readMaxPerDay,
} from "@/lib/capacity";

/**
 * How full each day of a competition is.
 *
 * Read by the organizer's limit editor and by the entry form, so both show the
 * same numbers `POST /api/competitors` enforces.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { response } = await requireAuth();
    if (response) return response;

    const { id } = await params;
    const bookingId = parseInt(id);

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        startDate: true,
        endDate: true,
        competitionInfo: { select: { maxCompetitorsPerDay: true } },
      },
    });
    if (!booking) {
      return NextResponse.json(
        { error: "Võistlust ei leitud" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      dates: competitionDates(booking.startDate, booking.endDate),
      maxPerDay: readMaxPerDay(booking.competitionInfo?.maxCompetitorsPerDay),
      registeredPerDay: await countRegisteredPerDay(bookingId),
    });
  } catch {
    return NextResponse.json({ error: "Serveri viga" }, { status: 500 });
  }
}
