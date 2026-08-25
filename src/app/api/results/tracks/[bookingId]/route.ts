import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { response } = await requireRole("ORGANIZER", "ADMIN");
    if (response) return response;

    const { bookingId } = await params;
    const id = parseInt(bookingId);

    const tracks = await prisma.competitionTrack.findMany({
      where: { bookingId: id },
      orderBy: [{ competitionDate: "asc" }, { sortOrder: "asc" }],
    });

    // Get competitor counts from start_protocol for each track
    const tracksWithCounts = await Promise.all(
      tracks.map(async (track) => {
        const competitorCount = await prisma.startProtocol.groupBy({
          by: ["competitorId"],
          where: { competitionTrackId: track.id },
        });

        return {
          ...track,
          competitorCount: competitorCount.length,
        };
      })
    );

    return NextResponse.json(tracksWithCounts);
  } catch {
    return NextResponse.json({ error: "Serveri viga" }, { status: 500 });
  }
}
