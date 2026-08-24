import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { teamSchema } from "@/lib/validations";
import { z } from "zod";

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

    const booking = await prisma.booking.findUnique({
      where: { id },
      select: { teamsLocked: true, teamsPublished: true },
    });
    if (!booking) {
      return NextResponse.json(
        { error: "Broneeringut ei leitud" },
        { status: 404 }
      );
    }

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
      },
      orderBy: [{ competitionDate: "asc" }, { sortOrder: "asc" }],
    });

    return NextResponse.json({
      teamsLocked: booking.teamsLocked,
      teamsPublished: booking.teamsPublished,
      teams,
    });
  } catch {
    return NextResponse.json({ error: "Serveri viga" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
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

    // Verify ownership
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

    const body = await req.json();
    const teamsArraySchema = z.array(teamSchema);
    const parsed = teamsArraySchema.safeParse(body.teams);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const teamsData = parsed.data;

    const result = await prisma.$transaction(async (tx) => {
      // Delete all existing teams (cascade deletes members)
      await tx.team.deleteMany({
        where: { bookingId: id },
      });

      // Create new teams with members
      let createdCount = 0;
      for (const teamData of teamsData) {
        await tx.team.create({
          data: {
            bookingId: id,
            competitionDate: new Date(teamData.competitionDate),
            size: teamData.size,
            trackType: teamData.trackType || null,
            teamName: teamData.teamName,
            sortOrder: teamData.sortOrder,
            members: {
              create: teamData.members.map((competitorId, index) => ({
                competitorId,
                sortOrder: index,
              })),
            },
          },
        });
        createdCount++;
      }

      return createdCount;
    });

    return NextResponse.json(
      { message: "Meeskonnad salvestatud", count: result },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: "Serveri viga" }, { status: 500 });
  }
}
