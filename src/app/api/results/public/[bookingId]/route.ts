import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { bookingId } = await params;
    const id = parseInt(bookingId);

    // Get booking info
    const booking = await prisma.booking.findUnique({
      where: { id },
      select: {
        id: true,
        organizerName: true,
        clubName: true,
        location: true,
        startDate: true,
        endDate: true,
        competitionOfficiality: true,
        protocolPublished: true,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: "Broneeringut ei leitud" },
        { status: 404 }
      );
    }

    // Get all tracks with parameters and competitor results
    const tracks = await prisma.competitionTrack.findMany({
      where: { bookingId: id },
      orderBy: [{ competitionDate: "asc" }, { sortOrder: "asc" }],
      include: {
        trackResults: true,
        competitorResults: {
          include: {
            competitor: {
              include: {
                handler: {
                  select: {
                    id: true,
                    handlerName: true,
                    clubName: true,
                    country: true,
                  },
                },
                dog: {
                  select: {
                    id: true,
                    nickName: true,
                    sizeEst: true,
                    sizeOfficial: true,
                    sizeOfficialFci: true,
                    sizeFci: true,
                    agilityClass: true,
                    jumpClass: true,
                    breed: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Format response with Decimal conversions
    const tracksFormatted = tracks.map((track) => {
      const parameters = track.trackResults.map((p) => ({
        id: p.id,
        sizeGroup: p.sizeGroup,
        trackLength: p.trackLength ? Number(p.trackLength) : null,
        trackSpeed: p.trackSpeed ? Number(p.trackSpeed) : null,
        idealTime: p.idealTime ? Number(p.idealTime) : null,
        maxTime: p.maxTime ? Number(p.maxTime) : null,
      }));

      const competitors = track.competitorResults.map((cr) => ({
        competitorId: cr.competitorId,
        handler: cr.competitor.handler,
        dog: cr.competitor.dog,
        timeSeconds: cr.timeSeconds ? Number(cr.timeSeconds) : null,
        faults: cr.faults,
        isDsq: cr.isDsq,
        isDns: cr.isDns,
        hasQualification: cr.hasQualification,
        notes: cr.notes,
      }));

      return {
        track: {
          id: track.id,
          competitionDate: track.competitionDate,
          letter: track.letter,
          trackType: track.trackType,
          size: track.size,
          officiality: track.officiality,
          referee: track.referee,
          sizeStandard: track.sizeStandard,
          sortOrder: track.sortOrder,
          isRelay: track.isRelay,
        },
        parameters,
        competitors,
      };
    });

    return NextResponse.json({
      booking,
      tracks: tracksFormatted,
    });
  } catch {
    return NextResponse.json({ error: "Serveri viga" }, { status: 500 });
  }
}
