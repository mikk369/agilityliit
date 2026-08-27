import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { competitorTracksSchema } from "@/lib/validations";
import { isRegistrationOpen } from "@/lib/registration";

/**
 * Replace a competitor's own track selection.
 *
 * Only the owning handler edits their entry, and only while registration is
 * open — once it closes the start protocol is being built from these rows.
 */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, response } = await requireAuth();
    if (response) return response;

    const { id } = await params;
    const competitorId = parseInt(id);

    const competitor = await prisma.competitor.findUnique({
      where: { id: competitorId },
      include: {
        handler: { select: { userId: true } },
        booking: true,
      },
    });
    if (!competitor) {
      return NextResponse.json({ error: "Võistlejat ei leitud" }, { status: 404 });
    }

    if (competitor.handler.userId !== parseInt(session.user.id)) {
      return NextResponse.json({ error: "Keelatud" }, { status: 403 });
    }

    if (!isRegistrationOpen(competitor.booking)) {
      return NextResponse.json(
        { error: "Registreerimine on suletud" },
        { status: 400 }
      );
    }

    const parsed = competitorTracksSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }
    const { trackIds, sizeStandard } = parsed.data;

    // Every track must belong to this competition, or the entry would land in
    // another organizer's protocol.
    const tracks = await prisma.competitionTrack.findMany({
      where: { id: { in: trackIds }, bookingId: competitor.bookingId },
      select: { id: true, competitionDate: true },
    });
    if (tracks.length !== trackIds.length) {
      return NextResponse.json(
        { error: "Rada ei kuulu sellele võistlusele" },
        { status: 400 }
      );
    }

    // Replace wholesale: the client sends the full selection, not a delta.
    await prisma.$transaction([
      prisma.competitorTrack.deleteMany({ where: { competitorId } }),
      prisma.competitorTrack.createMany({
        data: tracks.map((track) => ({
          competitorId,
          competitionTrackId: track.id,
          competitionDate: track.competitionDate,
          sizeStandard: sizeStandard || null,
        })),
      }),
    ]);

    const updated = await prisma.competitorTrack.findMany({
      where: { competitorId },
      include: { competitionTrack: true },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Serveri viga" }, { status: 500 });
  }
}
