import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Autentimata" }, { status: 401 });
    }
    if (session.user.role !== "ORGANIZER" && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Keelatud" }, { status: 403 });
    }

    const { id } = await params;
    const bookingId = parseInt(id);

    const competitors = await prisma.competitor.findMany({
      where: { bookingId },
      include: {
        handler: {
          select: { id: true, handlerName: true, clubName: true, country: true },
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
        competitorTracks: {
          include: {
            competitionTrack: {
              select: {
                id: true,
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
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(competitors);
  } catch {
    return NextResponse.json({ error: "Serveri viga" }, { status: 500 });
  }
}
