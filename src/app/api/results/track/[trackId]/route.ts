import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ trackId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Autentimata" }, { status: 401 });
    }
    if (session.user.role !== "ORGANIZER" && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Keelatud" }, { status: 403 });
    }

    const { trackId } = await params;
    const id = parseInt(trackId);

    // Get track info with booking
    const track = await prisma.competitionTrack.findUnique({
      where: { id },
      include: {
        booking: {
          select: {
            id: true,
            userId: true,
            organizerName: true,
            clubName: true,
            location: true,
            competitionType: true,
          },
        },
      },
    });

    if (!track) {
      return NextResponse.json(
        { error: "Rada ei leitud" },
        { status: 404 }
      );
    }

    // Get track parameters
    const parameters = await prisma.trackResult.findMany({
      where: { competitionTrackId: id },
    });

    // Convert Decimal fields to numbers for JSON serialization
    const parametersJson = parameters.map((p) => ({
      ...p,
      trackLength: p.trackLength ? Number(p.trackLength) : null,
      trackSpeed: p.trackSpeed ? Number(p.trackSpeed) : null,
      idealTime: p.idealTime ? Number(p.idealTime) : null,
      maxTime: p.maxTime ? Number(p.maxTime) : null,
    }));

    // Get competitors from start protocol with results
    const protocolEntries = await prisma.startProtocol.findMany({
      where: { competitionTrackId: id },
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
                sizeFci: true,
                agilityClass: true,
                jumpClass: true,
                breed: true,
              },
            },
            results: {
              where: { competitionTrackId: id },
            },
          },
        },
      },
      orderBy: { sortOrder: "asc" },
    });

    // Map protocol entries to competitor data with results
    const competitors = protocolEntries.map((entry) => {
      const result = entry.competitor.results[0] || null;
      return {
        startProtocolId: entry.id,
        competitorId: entry.competitorId,
        startNumber: entry.startNumber,
        sortOrder: entry.sortOrder,
        size: entry.size,
        handler: entry.competitor.handler,
        dog: entry.competitor.dog,
        result: result
          ? {
              id: result.id,
              timeSeconds: result.timeSeconds
                ? Number(result.timeSeconds)
                : null,
              faults: result.faults,
              isDsq: result.isDsq,
              isDns: result.isDns,
              hasQualification: result.hasQualification,
              notes: result.notes,
            }
          : null,
      };
    });

    // Also get ACCEPTED competitors registered for this track but not yet in protocol
    const protocolCompetitorIds = protocolEntries.map((e) => e.competitorId);

    const unlistedCompetitors = await prisma.competitorTrack.findMany({
      where: {
        competitionTrackId: id,
        competitor: {
          status: "ACCEPTED",
          id: { notIn: protocolCompetitorIds },
        },
      },
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
                sizeFci: true,
                agilityClass: true,
                jumpClass: true,
                breed: true,
              },
            },
          },
        },
      },
    });

    const unlistedMapped = unlistedCompetitors.map((ct) => ({
      startProtocolId: null,
      competitorId: ct.competitorId,
      startNumber: 0,
      sortOrder: 0,
      size: ct.competitor.dog.sizeEst || ct.competitor.dog.sizeFci || "",
      handler: ct.competitor.handler,
      dog: ct.competitor.dog,
      result: null,
    }));

    return NextResponse.json({
      track,
      parameters: parametersJson,
      competitors,
      unlistedCompetitors: unlistedMapped,
    });
  } catch {
    return NextResponse.json({ error: "Serveri viga" }, { status: 500 });
  }
}
