import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const { session, response } = await requireAuth();
    if (response) return response;

    const handler = await prisma.handler.findUnique({
      where: { userId: parseInt(session.user.id) },
    });
    if (!handler) {
      return NextResponse.json(
        { error: "Koeraspetsialist puudub" },
        { status: 404 }
      );
    }

    const competitors = await prisma.competitor.findMany({
      where: { handlerId: handler.id },
      include: {
        booking: {
          select: {
            id: true,
            startDate: true,
            endDate: true,
            organizerName: true,
            clubName: true,
            location: true,
            competitionOfficiality: true,
            status: true,
            referee: true,
            regStatus: true,
            regCloseDate: true,
          },
        },
        dog: {
          select: {
            id: true,
            nickName: true,
            sizeEst: true,
            sizeOfficial: true,
            agilityClass: true,
            jumpClass: true,
          },
        },
        competitorTracks: {
          include: {
            competitionTrack: {
              select: {
                id: true,
                letter: true,
                trackType: true,
                size: true,
                officiality: true,
                competitionDate: true,
              },
            },
          },
        },
      },
      orderBy: { booking: { startDate: "desc" } },
    });

    return NextResponse.json(competitors);
  } catch {
    return NextResponse.json({ error: "Serveri viga" }, { status: 500 });
  }
}
