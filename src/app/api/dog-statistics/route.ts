import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";

/**
 * GET /api/dog-statistics
 *
 * Public search endpoint for competition results across all competitions.
 * Filters: organizer, breed, gender, dog_name, register_code, handler_name, judge, date_from, date_to
 * Pagination: page, per_page (20/50/100)
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const organizer = url.searchParams.get("organizer") || "";
    const breed = url.searchParams.get("breed") || "";
    const gender = url.searchParams.get("gender") || "";
    const dogName = url.searchParams.get("dog_name") || "";
    const registerCode = url.searchParams.get("register_code") || "";
    const handlerName = url.searchParams.get("handler_name") || "";
    const judge = url.searchParams.get("judge") || "";
    const dateFrom = url.searchParams.get("date_from") || "";
    const dateTo = url.searchParams.get("date_to") || "";
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    let perPage = parseInt(url.searchParams.get("per_page") || "50");
    if (![20, 50, 100].includes(perPage)) perPage = 50;

    // Build where conditions for competitorResult
    const where: Prisma.CompetitorResultWhereInput = {};
    const competitorWhere: Prisma.CompetitorWhereInput = {};
    const dogWhere: Prisma.DogWhereInput = {};
    const handlerWhere: Prisma.HandlerWhereInput = {};
    const trackWhere: Prisma.CompetitionTrackWhereInput = {};
    const bookingWhere: Prisma.BookingWhereInput = {};

    if (organizer) bookingWhere.clubName = organizer;
    if (breed) dogWhere.breed = breed;
    if (gender && ["Isane", "Emane"].includes(gender)) dogWhere.gender = gender;
    if (dogName) dogWhere.nickName = { contains: dogName };
    if (registerCode) dogWhere.registerCode = { contains: registerCode };
    if (handlerName) {
      handlerWhere.handlerName = { contains: handlerName };
    }
    if (judge) trackWhere.referee = { contains: judge };
    if (dateFrom) trackWhere.competitionDate = { ...(trackWhere.competitionDate as object || {}), gte: new Date(dateFrom) };
    if (dateTo) {
      const existing = trackWhere.competitionDate as Prisma.DateTimeFilter || {};
      trackWhere.competitionDate = { ...existing, lte: new Date(dateTo) };
    }

    // Apply nested filters
    if (Object.keys(dogWhere).length > 0) competitorWhere.dog = dogWhere;
    if (Object.keys(handlerWhere).length > 0) competitorWhere.handler = handlerWhere;
    if (Object.keys(bookingWhere).length > 0) trackWhere.booking = bookingWhere;

    if (Object.keys(competitorWhere).length > 0) where.competitor = competitorWhere;
    if (Object.keys(trackWhere).length > 0) where.competitionTrack = trackWhere;

    const total = await prisma.competitorResult.count({ where });

    if (total === 0) {
      return NextResponse.json({
        results: [],
        total: 0,
        page,
        per_page: perPage,
        total_pages: 0,
      });
    }

    const totalPages = Math.ceil(total / perPage);
    const offset = (page - 1) * perPage;

    const rows = await prisma.competitorResult.findMany({
      where,
      include: {
        competitor: {
          include: {
            dog: {
              select: { nickName: true, breed: true, registerCode: true },
            },
            handler: {
              select: { handlerName: true },
            },
          },
        },
        competitionTrack: {
          select: {
            id: true,
            letter: true,
            trackType: true,
            competitionDate: true,
            referee: true,
            size: true,
            booking: {
              select: { clubName: true, competitionType: true },
            },
          },
        },
      },
      orderBy: [
        { competitionTrack: { competitionDate: "desc" } },
        { competitionTrackId: "asc" },
      ],
      skip: offset,
      take: perPage,
    });

    // Calculate places for each track in the results
    const trackIds = [...new Set(rows.map((r) => r.competitionTrackId))];
    const placesMap: Record<number, number> = {};

    for (const trackId of trackIds) {
      const ranked = await prisma.competitorResult.findMany({
        where: {
          competitionTrackId: trackId,
          isDsq: false,
          isDns: false,
        },
        orderBy: [{ faults: "asc" }, { timeSeconds: "asc" }],
        select: { id: true },
      });
      ranked.forEach((r, idx) => {
        placesMap[r.id] = idx + 1;
      });
    }

    const results = rows.map((row) => {
      const dateFormatted = row.competitionTrack.competitionDate
        ? new Date(row.competitionTrack.competitionDate)
            .toLocaleDateString("et-EE", { day: "2-digit", month: "2-digit", year: "2-digit" })
        : "";

      let grade = "";
      if (row.isDsq) grade = "diskval.";
      else if (row.isDns) grade = "mitteilm.";

      const resultVal = row.hasQualification ? row.competitionTrack.letter : "";

      const compType = row.competitionTrack.booking.competitionType?.toLowerCase().includes("eksam")
        ? "eksam"
        : "võistlus";

      return {
        competition_date: dateFormatted,
        track_type: row.competitionTrack.letter,
        competition_type: compType,
        organizer: row.competitionTrack.booking.clubName || "",
        judge: row.competitionTrack.referee || "",
        breed: row.competitor.dog.breed || "",
        dog_name: row.competitor.dog.nickName || "",
        handler_name: row.competitor.handler.handlerName,
        points: row.timeSeconds ? Number(row.timeSeconds) : null,
        faults: row.faults,
        grade,
        result: resultVal,
        place: placesMap[row.id] ?? null,
      };
    });

    return NextResponse.json({
      results,
      total,
      page,
      per_page: perPage,
      total_pages: totalPages,
    });
  } catch (e) {
    console.error("Dog statistics search error:", e);
    return NextResponse.json({ error: "Serveri viga" }, { status: 500 });
  }
}
