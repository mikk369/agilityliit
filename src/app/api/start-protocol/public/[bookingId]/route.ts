import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { bookingId } = await params;
    const id = parseInt(bookingId);

    if (isNaN(id)) {
      return NextResponse.json({ error: "Vigane ID" }, { status: 400 });
    }

    const booking = await prisma.booking.findUnique({
      where: { id },
      select: {
        id: true,
        organizerName: true,
        clubName: true,
        location: true,
        startDate: true,
        endDate: true,
        protocolPublished: true,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: "Võistlust ei leitud" },
        { status: 404 }
      );
    }

    if (booking.protocolPublished === 0) {
      return NextResponse.json(
        { error: "Stardiprotokoll pole avaldatud" },
        { status: 403 }
      );
    }

    const entries = await prisma.startProtocol.findMany({
      where: { bookingId: id },
      include: {
        competitor: {
          include: {
            handler: {
              select: {
                handlerName: true,
                clubName: true,
                country: true,
              },
            },
            dog: {
              select: {
                nickName: true,
                breed: true,
                sizeEst: true,
                sizeOfficial: true,
                sizeOfficialFci: true,
                sizeFci: true,
                agilityClass: true,
                jumpClass: true,
              },
            },
          },
        },
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
      orderBy: [{ competitionDate: "asc" }, { sortOrder: "asc" }],
    });

    return NextResponse.json({ booking, entries });
  } catch {
    return NextResponse.json({ error: "Serveri viga" }, { status: 500 });
  }
}
