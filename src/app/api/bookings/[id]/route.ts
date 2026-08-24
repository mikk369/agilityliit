import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { bookingUpdateSchema } from "@/lib/validations";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const booking = await prisma.booking.findUnique({
      where: { id: parseInt(id) },
      include: {
        competitionInfo: true,
        competitionTracks: {
          orderBy: [{ competitionDate: "asc" }, { sortOrder: "asc" }],
        },
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: "Broneeringut ei leitud" },
        { status: 404 }
      );
    }

    return NextResponse.json(booking);
  } catch {
    return NextResponse.json({ error: "Serveri viga" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Autentimata" }, { status: 401 });
    }

    const { id } = await params;
    const bookingId = parseInt(id);

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
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
    const parsed = bookingUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const updateData: Record<string, unknown> = {};

    if (data.startDate) updateData.startDate = new Date(data.startDate);
    if (data.endDate) updateData.endDate = new Date(data.endDate);
    if (data.qualTime !== undefined) updateData.qualTime = data.qualTime || null;
    if (data.organizerName) updateData.organizerName = data.organizerName;
    if (data.clubName) updateData.clubName = data.clubName;
    if (data.email) updateData.email = data.email;
    if (data.phone) updateData.phone = data.phone;
    if (data.location) updateData.location = data.location;
    if (data.referee) updateData.referee = data.referee;
    if (data.info !== undefined) updateData.info = data.info || null;
    if (data.competitionClasses !== undefined)
      updateData.competitionClasses = data.competitionClasses || null;
    if (data.competitionType) updateData.competitionType = data.competitionType;
    if (data.status) updateData.status = data.status;
    if (data.regStatus !== undefined)
      updateData.regStatus = data.regStatus || null;
    if (data.regCloseDate !== undefined)
      updateData.regCloseDate = data.regCloseDate
        ? new Date(data.regCloseDate)
        : null;

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Serveri viga" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Autentimata" }, { status: 401 });
    }

    const { id } = await params;
    const bookingId = parseInt(id);

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { _count: { select: { competitors: true } } },
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

    if (booking._count.competitors > 0) {
      return NextResponse.json(
        { error: "Ei saa kustutada - võistlejad on juba registreeritud" },
        { status: 400 }
      );
    }

    await prisma.booking.delete({ where: { id: bookingId } });

    return NextResponse.json({ message: "Broneering kustutatud" });
  } catch {
    return NextResponse.json({ error: "Serveri viga" }, { status: 500 });
  }
}
