import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Autentimata" }, { status: 401 });
    }
    if (session.user.role !== "ORGANIZER" && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Keelatud" }, { status: 403 });
    }

    const { id } = await params;
    const competitorId = parseInt(id);

    const body = await req.json();
    const { status, remarks, needsMeasurement, needsCompetitionBook } = body;

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
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Autentimata" }, { status: 401 });
    }

    const { id } = await params;
    const competitorId = parseInt(id);

    const competitor = await prisma.competitor.findUnique({
      where: { id: competitorId },
      include: { handler: { select: { userId: true } } },
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

    // Own handler can only delete if status is PENDING
    if (isOwner && !isPrivileged && competitor.status !== "PENDING") {
      return NextResponse.json(
        { error: "Kinnitatud registreeringut ei saa tühistada" },
        { status: 400 }
      );
    }

    await prisma.competitor.delete({ where: { id: competitorId } });

    return NextResponse.json({ message: "Registreering tühistatud" });
  } catch {
    return NextResponse.json({ error: "Serveri viga" }, { status: 500 });
  }
}
