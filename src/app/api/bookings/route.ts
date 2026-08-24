import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { bookingSchema } from "@/lib/validations";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const mine = searchParams.get("mine");

    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    if (mine === "true") {
      const session = await getServerSession(authOptions);
      if (!session) {
        return NextResponse.json({ error: "Autentimata" }, { status: 401 });
      }
      where.userId = parseInt(session.user.id);
    }

    const bookings = await prisma.booking.findMany({
      where,
      select: {
        id: true,
        userId: true,
        startDate: true,
        endDate: true,
        organizerName: true,
        clubName: true,
        location: true,
        competitionType: true,
        status: true,
        regStatus: true,
        regCloseDate: true,
      },
      orderBy: { startDate: "desc" },
    });

    return NextResponse.json(bookings);
  } catch {
    return NextResponse.json({ error: "Serveri viga" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Autentimata" }, { status: 401 });
    }
    if (session.user.role !== "ORGANIZER" && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Keelatud" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = bookingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const booking = await prisma.booking.create({
      data: {
        userId: parseInt(session.user.id),
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        qualTime: data.qualTime || null,
        organizerName: data.organizerName,
        clubName: data.clubName,
        email: data.email,
        phone: data.phone,
        location: data.location,
        referee: data.referee || [],
        info: data.info || null,
        competitionClasses: data.competitionClasses || null,
        competitionType: data.competitionType,
        status: data.status || "PENDING",
        regCloseDate: data.regCloseDate ? new Date(data.regCloseDate) : null,
      },
    });

    return NextResponse.json(booking, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Serveri viga" }, { status: 500 });
  }
}
