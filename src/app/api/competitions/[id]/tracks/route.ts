import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { competitionTrackSchema } from "@/lib/validations";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const bookingId = parseInt(id);

    const tracks = await prisma.competitionTrack.findMany({
      where: { bookingId },
      orderBy: [{ competitionDate: "asc" }, { sortOrder: "asc" }],
    });

    return NextResponse.json(tracks);
  } catch {
    return NextResponse.json({ error: "Serveri viga" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, response } = await requireAuth();
    if (response) return response;

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
    const parsed = competitionTrackSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const track = await prisma.competitionTrack.create({
      data: {
        bookingId,
        competitionDate: new Date(data.competitionDate),
        letter: data.letter,
        trackType: data.trackType,
        size: data.size,
        officiality: data.officiality,
        referee: data.referee || null,
        sizeStandard: data.sizeStandard || null,
        sortOrder: data.sortOrder || 0,
        isRelay: data.isRelay || false,
      },
    });

    return NextResponse.json(track, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Serveri viga" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, response } = await requireAuth();
    if (response) return response;

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
    const { trackId } = body;

    if (!trackId) {
      return NextResponse.json(
        { error: "Raja ID on kohustuslik" },
        { status: 400 }
      );
    }

    // Check no competitors registered for this track
    const registrations = await prisma.competitorTrack.count({
      where: { competitionTrackId: trackId },
    });
    if (registrations > 0) {
      return NextResponse.json(
        { error: "Ei saa kustutada - rajale on juba registreeritud võistlejaid" },
        { status: 400 }
      );
    }

    await prisma.competitionTrack.delete({ where: { id: trackId } });

    return NextResponse.json({ message: "Rada kustutatud" });
  } catch {
    return NextResponse.json({ error: "Serveri viga" }, { status: 500 });
  }
}
