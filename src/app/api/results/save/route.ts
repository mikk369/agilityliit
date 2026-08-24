import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { competitorResultSchema } from "@/lib/validations";

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
    const parsed = competitorResultSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Verify track exists and user owns the booking
    const track = await prisma.competitionTrack.findUnique({
      where: { id: data.competitionTrackId },
      include: {
        booking: { select: { id: true, userId: true } },
      },
    });

    if (!track) {
      return NextResponse.json(
        { error: "Rada ei leitud" },
        { status: 404 }
      );
    }

    const isOwner = track.booking.userId === parseInt(session.user.id);
    const isAdmin = session.user.role === "ADMIN";
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Keelatud" }, { status: 403 });
    }

    // Look up start_protocol_id, auto-create if missing
    let startProtocol = await prisma.startProtocol.findFirst({
      where: {
        competitorId: data.competitorId,
        competitionTrackId: data.competitionTrackId,
      },
    });

    if (!startProtocol) {
      // Auto-create a start protocol entry
      const competitor = await prisma.competitor.findUnique({
        where: { id: data.competitorId },
        include: {
          dog: { select: { sizeEst: true, sizeFci: true } },
        },
      });

      if (!competitor) {
        return NextResponse.json(
          { error: "Võistlejat ei leitud" },
          { status: 404 }
        );
      }

      startProtocol = await prisma.startProtocol.create({
        data: {
          bookingId: track.booking.id,
          competitorId: data.competitorId,
          competitionTrackId: data.competitionTrackId,
          competitionDate: track.competitionDate,
          size: competitor.dog.sizeEst || competitor.dog.sizeFci || "",
          startNumber: 0,
          sortOrder: 0,
        },
      });
    }

    // Upsert the result
    const result = await prisma.competitorResult.upsert({
      where: {
        competitorId_competitionTrackId: {
          competitorId: data.competitorId,
          competitionTrackId: data.competitionTrackId,
        },
      },
      update: {
        startProtocolId: startProtocol.id,
        timeSeconds: data.timeSeconds ?? null,
        faults: data.faults,
        isDsq: data.isDsq,
        isDns: data.isDns,
        hasQualification: data.hasQualification,
      },
      create: {
        startProtocolId: startProtocol.id,
        competitorId: data.competitorId,
        competitionTrackId: data.competitionTrackId,
        timeSeconds: data.timeSeconds ?? null,
        faults: data.faults,
        isDsq: data.isDsq,
        isDns: data.isDns,
        hasQualification: data.hasQualification,
      },
    });

    // Convert Decimal for JSON
    return NextResponse.json({
      ...result,
      timeSeconds: result.timeSeconds ? Number(result.timeSeconds) : null,
    });
  } catch {
    return NextResponse.json({ error: "Serveri viga" }, { status: 500 });
  }
}
