import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

/**
 * GET /api/results/dog-progression/[dogId]
 *
 * Returns class progression data for a specific dog.
 * Progression rules:
 *   A1 → A2: 2 clean agility tracks
 *   A2 → A3: 3 clean agility tracks
 *   H1 → H2: 2 clean jumping tracks
 *   H2 → H3: 3 clean jumping tracks
 *
 * Clean = has_qualification=1 OR (faults=0, not DSQ/DNS, time <= idealTime, official competition)
 * Senior tracks are counted separately (no progression).
 * Only tracks AFTER the last class change date count.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ dogId: string }> }
) {
  try {
    const { session, response } = await requireAuth();
    if (response) return response;

    const { dogId } = await params;
    const dogIdNum = parseInt(dogId);
    if (isNaN(dogIdNum) || dogIdNum <= 0) {
      return NextResponse.json({ error: "Vigane koera ID" }, { status: 400 });
    }

    const dog = await prisma.dog.findUnique({
      where: { id: dogIdNum },
      select: {
        id: true,
        agilityClass: true,
        jumpClass: true,
        agilityClassChangedAt: true,
        jumpClassChangedAt: true,
      },
    });

    if (!dog) {
      return NextResponse.json({ error: "Koera ei leitud" }, { status: 404 });
    }

    // Get all results for this dog where qualification was achieved
    // OR the run was clean (0 faults, not DSQ/DNS, time exists)
    const allResults = await prisma.competitorResult.findMany({
      where: {
        competitor: { dogId: dogIdNum },
        OR: [
          { hasQualification: true },
          {
            faults: 0,
            isDsq: false,
            isDns: false,
            timeSeconds: { not: null },
          },
        ],
      },
      include: {
        competitionTrack: {
          select: {
            id: true,
            letter: true,
            trackType: true,
            officiality: true,
            competitionDate: true,
            booking: {
              select: { organizerName: true },
            },
            trackResults: {
              select: { sizeGroup: true, idealTime: true },
            },
          },
        },
        competitor: {
          include: {
            startProtocols: {
              select: { competitionTrackId: true, size: true },
            },
          },
        },
      },
      orderBy: {
        competitionTrack: { competitionDate: "asc" },
      },
    });

    // Filter to only truly clean tracks
    const cleanTracks: Array<{
      competitionName: string;
      trackName: string;
      trackTypeChar: string;
      date: Date;
      timeSeconds: number;
      faults: number;
    }> = [];

    for (const result of allResults) {
      const track = result.competitionTrack;

      // If manually marked as qualified, always count
      if (result.hasQualification) {
        cleanTracks.push({
          competitionName: track.booking.organizerName,
          trackName: `${track.letter} - ${track.trackType}`,
          trackTypeChar: track.trackType,
          date: track.competitionDate,
          timeSeconds: result.timeSeconds ? Number(result.timeSeconds) : 0,
          faults: result.faults,
        });
        continue;
      }

      // Otherwise check: faults=0, not DSQ/DNS, time <= idealTime for official competitions
      if (result.faults !== 0 || result.isDsq || result.isDns || !result.timeSeconds) {
        continue;
      }

      // Find the competitor's size from start protocol
      const protocol = result.competitor.startProtocols.find(
        (sp) => sp.competitionTrackId === track.id
      );
      const competitorSize = protocol?.size || "";

      // Check ideal time
      const trackParam = track.trackResults.find(
        (tr) => tr.sizeGroup === competitorSize
      );

      if (trackParam?.idealTime) {
        if (Number(result.timeSeconds) > Number(trackParam.idealTime)) {
          continue; // Over ideal time
        }
      }

      cleanTracks.push({
        competitionName: track.booking.organizerName,
        trackName: `${track.letter} - ${track.trackType}`,
        trackTypeChar: track.trackType,
        date: track.competitionDate,
        timeSeconds: Number(result.timeSeconds),
        faults: result.faults,
      });
    }

    // Separate by track type
    const agilityChangedAt = dog.agilityClassChangedAt;
    const jumpChangedAt = dog.jumpClassChangedAt;

    const agilityTracks: typeof cleanTracks = [];
    const jumpTracks: typeof cleanTracks = [];
    let seniorAgilityCount = 0;
    let seniorJumpCount = 0;

    for (const t of cleanTracks) {
      const type = t.trackTypeChar;

      if (type === "Seenior A") {
        seniorAgilityCount++;
      } else if (type === "Seenior H") {
        seniorJumpCount++;
      } else if (type.startsWith("A") || type.toLowerCase().includes("agility")) {
        if (agilityChangedAt && t.date < agilityChangedAt) continue;
        agilityTracks.push(t);
      } else if (type.startsWith("H") || type.toLowerCase().includes("jump") || type.toLowerCase().includes("hüp")) {
        if (jumpChangedAt && t.date < jumpChangedAt) continue;
        jumpTracks.push(t);
      }
    }

    // Determine progression requirements
    const agilityClass = dog.agilityClass || "";
    const jumpClass = dog.jumpClass || "";

    let agilityNext: string | null = null;
    let agilityRequired = 0;
    switch (agilityClass) {
      case "A1":
        agilityNext = "A2";
        agilityRequired = 2;
        break;
      case "A2":
        agilityNext = "A3";
        agilityRequired = 3;
        break;
    }

    let jumpNext: string | null = null;
    let jumpRequired = 0;
    switch (jumpClass) {
      case "H1":
        jumpNext = "H2";
        jumpRequired = 2;
        break;
      case "H2":
        jumpNext = "H3";
        jumpRequired = 3;
        break;
    }

    const agilityCount = agilityTracks.length;
    const jumpCount = jumpTracks.length;

    const agilityEligibleDate =
      agilityNext && agilityCount >= agilityRequired
        ? agilityTracks[agilityRequired - 1]?.date
        : null;

    const jumpEligibleDate =
      jumpNext && jumpCount >= jumpRequired
        ? jumpTracks[jumpRequired - 1]?.date
        : null;

    return NextResponse.json({
      dogId: dogIdNum,
      currentAgilityClass: agilityClass,
      currentJumpClass: jumpClass,
      agilityClearCount: agilityCount,
      agilityRequired,
      agilityNextClass: agilityNext,
      agilityEligible: agilityNext !== null && agilityCount >= agilityRequired,
      agilityEligibleDate,
      jumpClearCount: jumpCount,
      jumpRequired,
      jumpNextClass: jumpNext,
      jumpEligible: jumpNext !== null && jumpCount >= jumpRequired,
      jumpEligibleDate,
      seniorAgilityClearCount: seniorAgilityCount,
      seniorJumpClearCount: seniorJumpCount,
      clearTracks: [...agilityTracks, ...jumpTracks].map((t) => ({
        competitionName: t.competitionName,
        trackName: t.trackName,
        date: t.date,
        timeSeconds: t.timeSeconds,
        faults: t.faults,
      })),
    });
  } catch (e) {
    console.error("Dog progression error:", e);
    return NextResponse.json({ error: "Serveri viga" }, { status: 500 });
  }
}
