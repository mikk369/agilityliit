import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { teamResultSchema } from "@/lib/validations";
import { z } from "zod";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { bookingId } = await params;
    const id = parseInt(bookingId);

    const teams = await prisma.team.findMany({
      where: { bookingId: id },
      include: {
        members: {
          include: {
            competitor: {
              include: {
                handler: {
                  select: { id: true, handlerName: true },
                },
                dog: {
                  select: {
                    id: true,
                    nickName: true,
                    sizeEst: true,
                    breed: true,
                  },
                },
              },
            },
          },
          orderBy: { sortOrder: "asc" },
        },
        results: {
          include: {
            competitionTrack: {
              select: {
                id: true,
                letter: true,
                trackType: true,
                size: true,
                competitionDate: true,
              },
            },
          },
        },
      },
      orderBy: [{ competitionDate: "asc" }, { sortOrder: "asc" }],
    });

    // Convert Decimal to Number for JSON
    const teamsJson = teams.map((team) => ({
      ...team,
      results: team.results.map((r) => ({
        ...r,
        timeSeconds: r.timeSeconds ? Number(r.timeSeconds) : null,
      })),
    }));

    return NextResponse.json(teamsJson);
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

    const body = await req.json();
    const resultsArraySchema = z.array(teamResultSchema);
    const parsed = resultsArraySchema.safeParse(body.results);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const results = parsed.data;

    // Verify ownership via booking
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

    // Upsert each result
    const upserted = [];
    for (const result of results) {
      const saved = await prisma.teamResult.upsert({
        where: {
          teamId_competitionTrackId: {
            teamId: result.teamId,
            competitionTrackId: result.competitionTrackId,
          },
        },
        update: {
          timeSeconds: result.timeSeconds ?? null,
          faults: result.faults,
          isDsq: result.isDsq,
          isDns: result.isDns,
          notes: result.notes || null,
        },
        create: {
          teamId: result.teamId,
          competitionTrackId: result.competitionTrackId,
          timeSeconds: result.timeSeconds ?? null,
          faults: result.faults,
          isDsq: result.isDsq,
          isDns: result.isDns,
          notes: result.notes || null,
        },
      });
      upserted.push({
        ...saved,
        timeSeconds: saved.timeSeconds ? Number(saved.timeSeconds) : null,
      });
    }

    return NextResponse.json({
      message: "Meeskondade tulemused salvestatud",
      results: upserted,
    });
  } catch {
    return NextResponse.json({ error: "Serveri viga" }, { status: 500 });
  }
}
