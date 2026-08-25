import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { session, response } = await requireRole("ORGANIZER", "ADMIN");
    if (response) return response;

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

    // Toggle protocolPublished: 0 → 1, 1 → 0
    const newValue = booking.protocolPublished === 0 ? 1 : 0;

    const updated = await prisma.booking.update({
      where: { id },
      data: { protocolPublished: newValue },
      select: { id: true, protocolPublished: true },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Serveri viga" }, { status: 500 });
  }
}
