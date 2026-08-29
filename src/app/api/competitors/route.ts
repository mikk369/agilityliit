import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { competitorSchema } from "@/lib/validations";
import { isRegistrationOpen } from "@/lib/registration";
import {
  countRegisteredPerDay,
  dayFullError,
  readMaxPerDay,
  toDateKey,
} from "@/lib/capacity";

export async function POST(req: Request) {
  try {
    const { session, response } = await requireAuth();
    if (response) return response;

    const handler = await prisma.handler.findUnique({
      where: { userId: parseInt(session.user.id) },
    });
    if (!handler) {
      return NextResponse.json(
        { error: "Koeraspetsialist puudub. Palun loo esmalt profiil." },
        { status: 400 }
      );
    }

    const body = await req.json();
    const parsed = competitorSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Check booking exists and registration is open
    const booking = await prisma.booking.findUnique({
      where: { id: data.bookingId },
      include: {
        competitionInfo: { select: { maxCompetitorsPerDay: true } },
      },
    });
    if (!booking) {
      return NextResponse.json(
        { error: "Võistlust ei leitud" },
        { status: 404 }
      );
    }
    // Same rule the public calendar feed shows, so the two cannot disagree.
    if (!isRegistrationOpen(booking)) {
      return NextResponse.json(
        { error: "Registreerimine on suletud" },
        { status: 400 }
      );
    }

    // Check dog belongs to handler
    const dog = await prisma.dog.findUnique({
      where: { id: data.dogId },
    });
    if (!dog || dog.handlerId !== handler.id) {
      return NextResponse.json(
        { error: "Koer ei kuulu teile" },
        { status: 400 }
      );
    }

    // Check not already registered with this dog
    const existing = await prisma.competitor.findFirst({
      where: {
        bookingId: data.bookingId,
        handlerId: handler.id,
        dogId: data.dogId,
      },
    });
    if (existing) {
      return NextResponse.json(
        { error: "See koer on juba sellele võistlusele registreeritud" },
        { status: 409 }
      );
    }

    // The organizer's per-day cap. Checked here because this is the only place
    // an entry is created — the entry form greys out a full day, but a stale
    // page or a direct call would otherwise walk straight past it.
    const maxPerDay = readMaxPerDay(booking.competitionInfo?.maxCompetitorsPerDay);
    if (Object.keys(maxPerDay).length > 0 && data.trackIds?.length) {
      const tracks = await prisma.competitionTrack.findMany({
        where: { id: { in: data.trackIds }, bookingId: data.bookingId },
        select: { competitionDate: true },
      });

      // The day a track belongs to, not the single date the form posts: an
      // entry spanning two days takes a spot on each of them.
      const days = new Set(tracks.map((t) => toDateKey(t.competitionDate)));
      const registeredPerDay = await countRegisteredPerDay(data.bookingId);

      for (const day of days) {
        const max = maxPerDay[day];
        if (max !== undefined && (registeredPerDay[day] ?? 0) >= max) {
          return NextResponse.json(
            { error: dayFullError(day, max) },
            { status: 409 }
          );
        }
      }
    }

    // Create competitor and optional track registrations
    const competitor = await prisma.competitor.create({
      data: {
        bookingId: data.bookingId,
        handlerId: handler.id,
        dogId: data.dogId,
        remarks: data.remarks || null,
        needsMeasurement: data.needsMeasurement || false,
        needsCompetitionBook: data.needsCompetitionBook || false,
        competitorTracks:
          data.trackIds && data.trackIds.length > 0
            ? {
                create: data.trackIds.map((trackId) => ({
                  competitionTrackId: trackId,
                  competitionDate: data.competitionDate
                    ? new Date(data.competitionDate)
                    : booking.startDate,
                  sizeStandard: data.sizeStandard || null,
                })),
              }
            : undefined,
      },
      include: {
        dog: { select: { nickName: true, sizeEst: true } },
        competitorTracks: true,
      },
    });

    return NextResponse.json(competitor, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Serveri viga" }, { status: 500 });
  }
}
