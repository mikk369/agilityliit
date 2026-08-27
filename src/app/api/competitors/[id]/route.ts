import { NextResponse } from "next/server";
import { requireAuth, requireRole } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { isRegistrationOpen } from "@/lib/registration";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, response } = await requireRole("ORGANIZER", "ADMIN");
    if (response) return response;

    const { id } = await params;
    const competitorId = parseInt(id);

    const body = await req.json();
    const { status, remarks, needsMeasurement, needsCompetitionBook, handlerId } = body;

    const updateData: Record<string, unknown> = {};
    if (status !== undefined) {
      if (!["PENDING", "ACCEPTED"].includes(status)) {
        return NextResponse.json({ error: "Vigane staatus" }, { status: 400 });
      }
      updateData.status = status;
    }
    if (remarks !== undefined) updateData.remarks = remarks;
    if (needsMeasurement !== undefined)
      updateData.needsMeasurement = needsMeasurement;
    if (needsCompetitionBook !== undefined)
      updateData.needsCompetitionBook = needsCompetitionBook;

    // Point the entry at a different existing handler. Handler records are never
    // written here - an organizer must not be able to rename someone whose row is
    // shared with their own competitor pages.
    if (handlerId !== undefined) {
      const newHandlerId = parseInt(String(handlerId));
      if (!Number.isInteger(newHandlerId) || newHandlerId <= 0) {
        return NextResponse.json({ error: "Vigane koerajuht" }, { status: 400 });
      }
      const handlerExists = await prisma.handler.findUnique({
        where: { id: newHandlerId },
        select: { id: true },
      });
      if (!handlerExists) {
        return NextResponse.json(
          { error: "Koerajuhti ei leitud" },
          { status: 404 }
        );
      }
      updateData.handlerId = newHandlerId;
    }

    const competitor = await prisma.competitor.update({
      where: { id: competitorId },
      data: updateData,
    });

    return NextResponse.json(competitor);
  } catch {
    return NextResponse.json({ error: "Serveri viga" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, response } = await requireAuth();
    if (response) return response;

    const { id } = await params;
    const competitorId = parseInt(id);

    const competitor = await prisma.competitor.findUnique({
      where: { id: competitorId },
      include: { handler: { select: { userId: true } }, booking: true },
    });
    if (!competitor) {
      return NextResponse.json(
        { error: "Võistlejat ei leitud" },
        { status: 404 }
      );
    }

    const isOwner = competitor.handler.userId === parseInt(session.user.id);
    const isPrivileged =
      session.user.role === "ADMIN" || session.user.role === "ORGANIZER";

    if (!isOwner && !isPrivileged) {
      return NextResponse.json({ error: "Keelatud" }, { status: 403 });
    }

    // A competitor may withdraw while registration is open, whether or not the
    // organizer has accepted them; once it closes the entry is part of the
    // start protocol and only the organizer can remove it.
    if (isOwner && !isPrivileged && !isRegistrationOpen(competitor.booking)) {
      return NextResponse.json(
        { error: "Registreerimine on suletud" },
        { status: 400 }
      );
    }

    await prisma.competitor.delete({ where: { id: competitorId } });

    return NextResponse.json({ message: "Registreering tühistatud" });
  } catch {
    return NextResponse.json({ error: "Serveri viga" }, { status: 500 });
  }
}
