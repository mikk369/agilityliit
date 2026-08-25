import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { dogMeasurementSchema } from "@/lib/validations";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { session, response } = await requireRole("ORGANIZER", "ADMIN");
    if (response) return response;

    const { bookingId } = await params;
    const id = parseInt(bookingId);

    const measurements = await prisma.dogMeasurement.findMany({
      where: { bookingId: id },
      include: {
        dog: {
          select: {
            id: true,
            nickName: true,
            sizeEst: true,
            breed: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(measurements);
  } catch {
    return NextResponse.json({ error: "Serveri viga" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { session, response } = await requireRole("ORGANIZER", "ADMIN");
    if (response) return response;

    const { bookingId } = await params;
    const id = parseInt(bookingId);

    // Verify ownership
    const booking = await prisma.booking.findUnique({
      where: { id },
    });
    if (!booking) {
      return NextResponse.json(
        { error: "Broneeringut ei leitud" },
        { status: 404 }
      );
    }

    const isOwner = booking.userId === parseInt(session.user.id);
    const isAdmin = session.user.role === "ADMIN";
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Keelatud" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = dogMeasurementSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const measurement = await prisma.dogMeasurement.create({
      data: {
        dogId: data.dogId,
        bookingId: id,
        referee: data.referee,
        measurement: data.measurement,
      },
      include: {
        dog: {
          select: {
            id: true,
            nickName: true,
            sizeEst: true,
            breed: true,
          },
        },
      },
    });

    return NextResponse.json(measurement, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Serveri viga" }, { status: 500 });
  }
}
