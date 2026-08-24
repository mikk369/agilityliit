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
            location: true,
            competitionType: true,
            status: true,
          },
        },
        dog: {
          select: {
            id: true,
            nickName: true,
            sizeEst: true,
            agilityClass: true,
            jumpClass: true,
          },
        },
        competitorTracks: {
          include: {
            competitionTrack: {
              select: {
                letter: true,
                trackType: true,
                size: true,
                competitionType: true,
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
