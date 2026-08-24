import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { competitorSchema } from "@/lib/validations";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Autentimata" }, { status: 401 });
    }

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
    });
    if (!booking) {
      return NextResponse.json(
        { error: "Võistlust ei leitud" },
        { status: 404 }
      );
    }
    if (booking.regStatus === "reg_closed") {
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
