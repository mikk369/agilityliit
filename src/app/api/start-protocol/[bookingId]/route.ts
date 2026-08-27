import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { startProtocolEntrySchema } from "@/lib/validations";
import { z } from "zod";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { session, response } = await requireRole("ORGANIZER", "ADMIN");
    if (response) return response;

    const { bookingId } = await params;
    const id = parseInt(bookingId);

    const entries = await prisma.startProtocol.findMany({
      where: { bookingId: id },
      include: {
        competitor: {
          include: {
            handler: {
              select: {
                id: true,
                handlerName: true,
                clubName: true,
                country: true,
              },
            },
            dog: {
              select: {
                id: true,
                nickName: true,
                sizeEst: true,
                sizeOfficial: true,
                sizeOfficialFci: true,
                sizeFci: true,
                agilityClass: true,
                jumpClass: true,
                breed: true,
              },
            },
          },
        },
        competitionTrack: {
          select: {
            id: true,
            letter: true,
            trackType: true,
            size: true,
            competitionType: true,
            competitionDate: true,
          },
        },
      },
      orderBy: [{ competitionDate: "asc" }, { sortOrder: "asc" }],
    });

    return NextResponse.json(entries);
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
    const entriesSchema = z.array(startProtocolEntrySchema);
    const parsed = entriesSchema.safeParse(body.entries);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const entries = parsed.data;

    const result = await prisma.$transaction(async (tx) => {
      // Delete all existing entries for this booking
      await tx.startProtocol.deleteMany({
        where: { bookingId: id },
      });

      // Create new entries
      const created = await tx.startProtocol.createMany({
        data: entries.map((entry) => ({
          bookingId: id,
          competitorId: entry.competitorId,
          competitionTrackId: entry.competitionTrackId,
          competitionDate: new Date(entry.competitionDate),
          size: entry.size,
          startNumber: entry.startNumber,
          sortOrder: entry.sortOrder,
        })),
      });

      return created;
    });

    return NextResponse.json(
      { message: "Stardiprotokoll salvestatud", count: result.count },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: "Serveri viga" }, { status: 500 });
  }
}
