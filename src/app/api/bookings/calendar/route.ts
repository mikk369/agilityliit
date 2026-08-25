import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const bookings = await prisma.booking.findMany({
      where: {
        status: { in: ["BOOKED", "PENDING", "CLUBEVENT"] },
      },
      select: {
        id: true,
        startDate: true,
        endDate: true,
        organizerName: true,
        clubName: true,
        location: true,
        competitionType: true,
        competitionClasses: true,
        referee: true,
        info: true,
        status: true,
        regStatus: true,
      },
      orderBy: { startDate: "desc" },
    });

    return NextResponse.json(bookings);
  } catch {
    return NextResponse.json({ error: "Serveri viga" }, { status: 500 });
  }
}
