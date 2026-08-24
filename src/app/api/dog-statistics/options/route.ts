import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/dog-statistics/options
 *
 * Returns distinct organizer (club) names and breeds for dropdown filters.
 * Only includes values from competitions that have results.
 */
export async function GET() {
  try {
    // Get distinct club names from bookings that have results
    const bookingsWithResults = await prisma.booking.findMany({
      where: {
        competitionTracks: {
          some: {
            competitorResults: {
              some: {},
            },
          },
        },
        clubName: { not: "" },
      },
      select: { clubName: true },
      distinct: ["clubName"],
      orderBy: { clubName: "asc" },
    });

    const organizers = bookingsWithResults.map((b) => b.clubName);

    // Get distinct breeds from dogs that have results
    const dogsWithResults = await prisma.dog.findMany({
      where: {
        competitors: {
          some: {
            results: {
              some: {},
            },
          },
        },
        breed: { not: null },
        NOT: { breed: "" },
      },
      select: { breed: true },
      distinct: ["breed"],
      orderBy: { breed: "asc" },
    });

    const breeds = dogsWithResults
      .map((d) => d.breed)
      .filter((b): b is string => !!b);

    return NextResponse.json({ organizers, breeds });
  } catch (e) {
    console.error("Dog statistics options error:", e);
    return NextResponse.json({ error: "Serveri viga" }, { status: 500 });
  }
}
