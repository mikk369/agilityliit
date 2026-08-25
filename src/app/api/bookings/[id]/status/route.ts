import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, response } = await requireRole("ADMIN");
    if (response) return response;

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
