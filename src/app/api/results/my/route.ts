import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Autentimata" }, { status: 401 });
    }

    // Find handler for the current user
    const handler = await prisma.handler.findUnique({
      where: { userId: parseInt(session.user.id) },
    });

    if (!handler) {
      return NextResponse.json([]);
    }

    // Get all competitor results for this handler's competitors
    const results = await prisma.competitorResult.findMany({
      where: {
        competitor: {
          handlerId: handler.id,
        },
      },
      include: {
        competitor: {
          include: {
            dog: {
              select: { id: true, nickName: true, sizeEst: true, agilityClass: true, jumpClass: true },
            },
          },
        },
        competitionTrack: {
          select: {
            id: true,
            letter: true,
            trackType: true,
            competitionType: true,
            competitionDate: true,
            booking: {
              select: { id: true, organizerName: true, startDate: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = results.map((r) => ({
      id: r.id,
      dogNickName: r.competitor.dog.nickName,
      dogId: r.competitor.dog.id,
      bookingId: r.competitionTrack.booking.id,
      bookingName: r.competitionTrack.booking.organizerName,
      bookingDate: r.competitionTrack.booking.startDate,
      trackLetter: r.competitionTrack.letter,
      trackType: r.competitionTrack.trackType,
      competitionType: r.competitionTrack.competitionType,
      competitionDate: r.competitionTrack.competitionDate,
      timeSeconds: r.timeSeconds ? Number(r.timeSeconds) : null,
      faults: r.faults,
      isDsq: r.isDsq,
      isDns: r.isDns,
      hasQualification: r.hasQualification,
    }));

    return NextResponse.json(formatted);
  } catch {
    return NextResponse.json({ error: "Serveri viga" }, { status: 500 });
  }
}
