import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { bookingId } = await params;
    const id = parseInt(bookingId);

    const booking = await prisma.booking.findUnique({
      where: { id },
      select: { teamsPublished: true },
    });

    if (!booking) {
      return NextResponse.json(
        { error: "Broneeringut ei leitud" },
        { status: 404 }
      );
    }

    if (booking.teamsPublished !== 1) {
      return NextResponse.json(
        { error: "Meeskonnad ei ole avaldatud" },
        { status: 403 }
      );
    }

    const teams = await prisma.team.findMany({
      where: { bookingId: id },
      include: {
        members: {
          include: {
            competitor: {
              include: {
                handler: {
                  select: { handlerName: true },
                },
                dog: {
                  select: { nickName: true, sizeEst: true, breed: true },
                },
              },
            },
          },
          orderBy: { sortOrder: "asc" },
        },
        results: {
          include: {
            competitionTrack: {
              select: {
                id: true,
                letter: true,
                trackType: true,
                size: true,
                competitionDate: true,
              },
            },
          },
        },
      },
      orderBy: [{ competitionDate: "asc" }, { sortOrder: "asc" }],
    });

    // Convert Decimal to Number for JSON
    const teamsJson = teams.map((team) => ({
      ...team,
      results: team.results.map((r) => ({
        ...r,
        timeSeconds: r.timeSeconds ? Number(r.timeSeconds) : null,
      })),
    }));

    return NextResponse.json(teamsJson);
  } catch {
    return NextResponse.json({ error: "Serveri viga" }, { status: 500 });
  }
}
