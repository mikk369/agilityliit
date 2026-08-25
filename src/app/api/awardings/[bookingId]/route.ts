import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { awardingSchema } from "@/lib/validations";
import { z } from "zod";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { bookingId } = await params;
    const id = parseInt(bookingId);

    const awardings = await prisma.awarding.findMany({
      where: { bookingId: id },
      include: {
        tracks: true,
      },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json(awardings);
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
    const awardingsArraySchema = z.array(awardingSchema);
    const parsed = awardingsArraySchema.safeParse(body.awardings);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const awardingsData = parsed.data;

    const result = await prisma.$transaction(async (tx) => {
      // Delete all existing awardings (cascade deletes tracks)
      await tx.awarding.deleteMany({
        where: { bookingId: id },
      });

      // Create new awardings with tracks
      let createdCount = 0;
      for (const awardingData of awardingsData) {
        await tx.awarding.create({
          data: {
            bookingId: id,
            name: awardingData.name,
            sortOrder: awardingData.sortOrder,
            tracks: {
              create: awardingData.tracks.map((track) => ({
                letter: track.letter,
                trackType: track.trackType,
                competitionDate: new Date(track.competitionDate),
              })),
            },
          },
        });
        createdCount++;
      }

      return createdCount;
    });

    return NextResponse.json(
      { message: "Autasustamised salvestatud", count: result },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: "Serveri viga" }, { status: 500 });
  }
}
