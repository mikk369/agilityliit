import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { competitorInfoSchema } from "@/lib/validations";
import { isRegistrationOpen } from "@/lib/registration";

/**
 * The competitor's own remark on their entry.
 *
 * Split out from `PATCH /api/competitors/:id`, which is organizer territory —
 * that route also carries `status` and the organizer's checkboxes, and the
 * owner has no business writing those.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, response } = await requireAuth();
    if (response) return response;

    const { id } = await params;
    const competitorId = parseInt(id);

    const competitor = await prisma.competitor.findUnique({
      where: { id: competitorId },
      include: {
        handler: { select: { userId: true } },
        booking: true,
      },
    });
    if (!competitor) {
      return NextResponse.json({ error: "Võistlejat ei leitud" }, { status: 404 });
    }

    if (competitor.handler.userId !== parseInt(session.user.id)) {
      return NextResponse.json({ error: "Keelatud" }, { status: 403 });
    }

    if (!isRegistrationOpen(competitor.booking)) {
      return NextResponse.json(
        { error: "Registreerimine on suletud" },
        { status: 400 }
      );
    }

    const parsed = competitorInfoSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const updated = await prisma.competitor.update({
      where: { id: competitorId },
      data: { remarks: parsed.data.remarks || null },
      select: { id: true, remarks: true },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Serveri viga" }, { status: 500 });
  }
}
