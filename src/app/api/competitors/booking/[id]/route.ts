import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, response } = await requireRole("ORGANIZER", "ADMIN");
    if (response) return response;

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
            sizeOfficial: true,
            sizeOfficialFci: true,
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
