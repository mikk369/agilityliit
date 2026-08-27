import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

/**
 * Measurement history of a single dog, for the owning handler (organizers and
 * admins may read any dog). Grouped per competition on the client.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, response } = await requireAuth();
    if (response) return response;

    const { id } = await params;
    const dogId = parseInt(id);

    const dog = await prisma.dog.findUnique({
      where: { id: dogId },
      select: {
        sizeOfficial: true,
        sizeOfficialFci: true,
        handler: { select: { userId: true } },
      },
    });
    if (!dog) {
      return NextResponse.json({ error: "Koera ei leitud" }, { status: 404 });
    }

    const isOwner = dog.handler.userId === parseInt(session.user.id);
    const isPrivileged =
      session.user.role === "ADMIN" || session.user.role === "ORGANIZER";
    if (!isOwner && !isPrivileged) {
      return NextResponse.json({ error: "Keelatud" }, { status: 403 });
    }

    const rows = await prisma.dogMeasurement.findMany({
      where: { dogId },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      include: {
        booking: {
          select: { id: true, organizerName: true, clubName: true, startDate: true },
        },
      },
    });

    return NextResponse.json({
      sizeOfficial: dog.sizeOfficial,
      sizeOfficialFci: dog.sizeOfficialFci,
      measurements: rows.map((row) => ({
        id: row.id,
        referee: row.referee,
        measurementEst: row.measurementEst,
        measurementCm: row.measurementCm === null ? null : Number(row.measurementCm),
        measurementFci: row.measurementFci,
        createdAt: row.createdAt.toISOString(),
        competitionId: row.booking.id,
        competitionName: row.booking.organizerName,
        competitionStartDate: row.booking.startDate.toISOString(),
      })),
    });
  } catch {
    return NextResponse.json({ error: "Serveri viga" }, { status: 500 });
  }
}
