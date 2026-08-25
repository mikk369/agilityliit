import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { session, response } = await requireRole("ORGANIZER", "ADMIN");
    if (response) return response;

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");

    const handlers = await prisma.handler.findMany({
      where: search
        ? {
            handlerName: { contains: search },
          }
        : undefined,
      select: {
        id: true,
        handlerName: true,
        clubName: true,
        country: true,
        email: true,
        phone: true,
      },
      orderBy: { handlerName: "asc" },
    });

    return NextResponse.json(handlers);
  } catch {
    return NextResponse.json({ error: "Serveri viga" }, { status: 500 });
  }
}
