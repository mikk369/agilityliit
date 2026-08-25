import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { dogUpdateSchema } from "@/lib/validations";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, response } = await requireAuth();
    if (response) return response;

    const { id } = await params;
    const dog = await prisma.dog.findUnique({
      where: { id: parseInt(id) },
      include: { handler: { select: { id: true, handlerName: true, userId: true } } },
    });

    if (!dog) {
      return NextResponse.json({ error: "Koera ei leitud" }, { status: 404 });
    }

    const isOwner = dog.handler.userId === parseInt(session.user.id);
    const isPrivileged =
      session.user.role === "ADMIN" || session.user.role === "ORGANIZER";
    if (!isOwner && !isPrivileged) {
      return NextResponse.json({ error: "Keelatud" }, { status: 403 });
    }

    return NextResponse.json(dog);
  } catch {
    return NextResponse.json({ error: "Serveri viga" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, response } = await requireAuth();
    if (response) return response;

    const { id } = await params;
    const dogId = parseInt(id);

    const dog = await prisma.dog.findUnique({
      where: { id: dogId },
      include: { handler: { select: { userId: true } } },
    });
    if (!dog) {
      return NextResponse.json({ error: "Koera ei leitud" }, { status: 404 });
    }

    const isOwner = dog.handler.userId === parseInt(session.user.id);
    const isAdmin = session.user.role === "ADMIN";
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Keelatud" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = dogUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const updateData: Record<string, unknown> = { ...data };

    // Parse date strings to Date objects
    if (data.birthday !== undefined)
      updateData.birthday = data.birthday ? new Date(data.birthday) : null;
    if (data.generalVaccinationEnd !== undefined)
      updateData.generalVaccinationEnd = data.generalVaccinationEnd
        ? new Date(data.generalVaccinationEnd)
        : null;
    if (data.rabiesVaccinationEnd !== undefined)
      updateData.rabiesVaccinationEnd = data.rabiesVaccinationEnd
        ? new Date(data.rabiesVaccinationEnd)
        : null;

    const updated = await prisma.dog.update({
      where: { id: dogId },
      data: updateData,
    });

    return NextResponse.json(updated);
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
    const dogId = parseInt(id);

    const dog = await prisma.dog.findUnique({
      where: { id: dogId },
      include: {
        handler: { select: { userId: true } },
        _count: { select: { competitors: true } },
      },
    });
    if (!dog) {
      return NextResponse.json({ error: "Koera ei leitud" }, { status: 404 });
    }

    const isOwner = dog.handler.userId === parseInt(session.user.id);
    const isAdmin = session.user.role === "ADMIN";
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Keelatud" }, { status: 403 });
    }

    if (dog._count.competitors > 0) {
      return NextResponse.json(
        { error: "Ei saa kustutada - koer on registreeritud võistlustele" },
        { status: 400 }
      );
    }

    await prisma.dog.delete({ where: { id: dogId } });

    return NextResponse.json({ message: "Koer kustutatud" });
  } catch {
    return NextResponse.json({ error: "Serveri viga" }, { status: 500 });
  }
}
