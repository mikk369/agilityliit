import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { competitionInfoSchema } from "@/lib/validations";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const bookingId = parseInt(id);

    const info = await prisma.competitionInfo.findUnique({
      where: { bookingId },
    });

    if (!info) {
      return NextResponse.json(
        { error: "Võistluse info puudub" },
        { status: 404 }
      );
    }

    return NextResponse.json(info);
  } catch {
    return NextResponse.json({ error: "Serveri viga" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, response } = await requireAuth();
    if (response) return response;

    const { id } = await params;
    const bookingId = parseInt(id);

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
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

    const body = await req.json();
    const parsed = competitionInfoSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Write only the fields this request carried. The info page saves the
    // descriptions, the sponsor list and the per-day limits from separate
    // panels, and a row that always wrote all four would blank whichever
    // panel the organizer did not touch.
    const values: {
      descriptionEst?: string | null;
      descriptionEng?: string | null;
      sponsorImages?: Prisma.InputJsonValue | typeof Prisma.DbNull;
      maxCompetitorsPerDay?: Prisma.InputJsonValue | typeof Prisma.DbNull;
    } = {};

    if (data.descriptionEst !== undefined) {
      values.descriptionEst = data.descriptionEst || null;
    }
    if (data.descriptionEng !== undefined) {
      values.descriptionEng = data.descriptionEng || null;
    }
    if (data.sponsorImages !== undefined) {
      values.sponsorImages = data.sponsorImages
        ? (data.sponsorImages as unknown as Prisma.InputJsonValue)
        : Prisma.DbNull;
    }
    if (data.maxCompetitorsPerDay !== undefined) {
      values.maxCompetitorsPerDay = data.maxCompetitorsPerDay
        ? (data.maxCompetitorsPerDay as unknown as Prisma.InputJsonValue)
        : Prisma.DbNull;
    }

    const info = await prisma.competitionInfo.upsert({
      where: { bookingId },
      create: { bookingId, ...values },
      update: values,
    });

    return NextResponse.json(info);
  } catch {
    return NextResponse.json({ error: "Serveri viga" }, { status: 500 });
  }
}
