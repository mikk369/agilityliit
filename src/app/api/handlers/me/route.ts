import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { handlerSchema, handlerUpdateSchema } from "@/lib/validations";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Autentimata" }, { status: 401 });
    }

    const handler = await prisma.handler.findUnique({
      where: { userId: parseInt(session.user.id) },
    });

    if (!handler) {
      return NextResponse.json(
        { error: "Koeraspetsialist puudub" },
        { status: 404 }
      );
    }

    return NextResponse.json(handler);
  } catch {
    return NextResponse.json({ error: "Serveri viga" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Autentimata" }, { status: 401 });
    }

    const userId = parseInt(session.user.id);

    const existing = await prisma.handler.findUnique({
      where: { userId },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Koeraspetsialist on juba olemas" },
        { status: 409 }
      );
    }

    const body = await req.json();
    const parsed = handlerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const handler = await prisma.handler.create({
      data: {
        userId,
        handlerName: parsed.data.handlerName,
        phone: parsed.data.phone || null,
        email: parsed.data.email || null,
        clubName: parsed.data.clubName || null,
        country: parsed.data.country || "EST",
      },
    });

    return NextResponse.json(handler, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Serveri viga" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Autentimata" }, { status: 401 });
    }

    const userId = parseInt(session.user.id);

    const existing = await prisma.handler.findUnique({
      where: { userId },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Koeraspetsialist puudub" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const parsed = handlerUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const handler = await prisma.handler.update({
      where: { userId },
      data: parsed.data,
    });

    return NextResponse.json(handler);
  } catch {
    return NextResponse.json({ error: "Serveri viga" }, { status: 500 });
  }
}
