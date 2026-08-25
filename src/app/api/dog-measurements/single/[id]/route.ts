import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, response } = await requireRole("ORGANIZER", "ADMIN");
    if (response) return response;

    const { id } = await params;
    const measurementId = parseInt(id);

    const measurement = await prisma.dogMeasurement.findUnique({
      where: { id: measurementId },
      include: {
        booking: { select: { userId: true } },
      },
    });

    if (!measurement) {
      return NextResponse.json(
        { error: "Mõõtmist ei leitud" },
        { status: 404 }
      );
    }

    const isOwner = measurement.booking.userId === parseInt(session.user.id);
    const isAdmin = session.user.role === "ADMIN";
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Keelatud" }, { status: 403 });
    }

    await prisma.dogMeasurement.delete({
      where: { id: measurementId },
    });

    return NextResponse.json({ message: "Mõõtmine kustutatud" });
  } catch {
    return NextResponse.json({ error: "Serveri viga" }, { status: 500 });
  }
}
