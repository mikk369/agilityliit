import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { trackParameterSchema } from "@/lib/validations";
import { z } from "zod";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ trackId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Autentimata" }, { status: 401 });
    }
    if (session.user.role !== "ORGANIZER" && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Keelatud" }, { status: 403 });
    }

    const { trackId } = await params;
    const id = parseInt(trackId);

    // Verify track exists and user owns the booking
    const track = await prisma.competitionTrack.findUnique({
      where: { id },
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

    const body = await req.json();
    const parametersSchema = z.array(trackParameterSchema);
    const parsed = parametersSchema.safeParse(body.parameters);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const parameters = parsed.data;

    const results = await prisma.$transaction(
      parameters.map((param) =>
        prisma.trackResult.upsert({
          where: {
            competitionTrackId_sizeGroup: {
              competitionTrackId: id,
              sizeGroup: param.sizeGroup,
            },
          },
          update: {
            trackLength: param.trackLength ?? null,
            trackSpeed: param.trackSpeed ?? null,
            idealTime: param.idealTime ?? null,
            maxTime: param.maxTime ?? null,
          },
          create: {
            competitionTrackId: id,
            sizeGroup: param.sizeGroup,
            trackLength: param.trackLength ?? null,
            trackSpeed: param.trackSpeed ?? null,
            idealTime: param.idealTime ?? null,
            maxTime: param.maxTime ?? null,
          },
        })
      )
    );

    // Convert Decimal fields for JSON response
    const resultsJson = results.map((r) => ({
      ...r,
      trackLength: r.trackLength ? Number(r.trackLength) : null,
      trackSpeed: r.trackSpeed ? Number(r.trackSpeed) : null,
      idealTime: r.idealTime ? Number(r.idealTime) : null,
      maxTime: r.maxTime ? Number(r.maxTime) : null,
    }));

    return NextResponse.json(resultsJson, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Serveri viga" }, { status: 500 });
  }
}
