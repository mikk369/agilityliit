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
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Keelatud" }, { status: 403 });
    }

    const { id } = await params;
    const bookingId = parseInt(id);

    const body = await req.json();
    const { status } = body;

    if (!["PENDING", "BOOKED", "CLUBEVENT"].includes(status)) {
      return NextResponse.json(
        { error: "Vigane staatus" },
        { status: 400 }
      );
    }

    const booking = await prisma.booking.update({
      where: { id: bookingId },
      data: { status },
    });

    return NextResponse.json(booking);
  } catch {
    return NextResponse.json({ error: "Serveri viga" }, { status: 500 });
  }
}
