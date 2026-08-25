import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { session, response } = await requireRole("ORGANIZER", "ADMIN");
    if (response) return response;

    const { bookingId } = await params;
    const id = parseInt(bookingId);

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

    const currentlyLocked = booking.teamsLocked === 1;

    if (!currentlyLocked) {
      // Locking: validate all teams have 3-4 members
      const teams = await prisma.team.findMany({
        where: { bookingId: id },
        include: { _count: { select: { members: true } } },
      });

      if (teams.length === 0) {
        return NextResponse.json(
          { error: "Meeskondi ei ole loodud" },
          { status: 400 }
        );
      }

      const invalidTeams = teams.filter(
        (t) => t._count.members < 3 || t._count.members > 4
      );

      if (invalidTeams.length > 0) {
        return NextResponse.json(
          { error: "Kõigis meeskondades peab olema 3-4 liiget" },
          { status: 400 }
        );
      }
    }

    const newValue = currentlyLocked ? 0 : 1;

    // If unlocking, also unpublish
    const updateData: Record<string, number> = { teamsLocked: newValue };
    if (currentlyLocked) {
      updateData.teamsPublished = 0;
    }

    await prisma.booking.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ teamsLocked: newValue });
  } catch {
    return NextResponse.json({ error: "Serveri viga" }, { status: 500 });
  }
}
