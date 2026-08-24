import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Autentimata" }, { status: 401 });
    }
    if (session.user.role !== "ORGANIZER" && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Keelatud" }, { status: 403 });
    }

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
