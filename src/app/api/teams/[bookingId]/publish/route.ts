import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Autentimata" }, { status: 401 });
    }
    if (session.user.role !== "ORGANIZER" && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Keelatud" }, { status: 403 });
    }

    const { bookingId } = await params;
    const id = parseInt(bookingId);

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

    const currentlyPublished = booking.teamsPublished === 1;

    // Can only publish if teams are locked
    if (!currentlyPublished && booking.teamsLocked !== 1) {
      return NextResponse.json(
        { error: "Meeskonnad peavad enne avaldamist olema lukustatud" },
        { status: 400 }
      );
    }

    const newValue = currentlyPublished ? 0 : 1;

    await prisma.booking.update({
      where: { id },
      data: { teamsPublished: newValue },
    });

    return NextResponse.json({ teamsPublished: newValue });
  } catch {
    return NextResponse.json({ error: "Serveri viga" }, { status: 500 });
  }
}
