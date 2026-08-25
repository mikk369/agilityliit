import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { session, response } = await requireRole("ORGANIZER", "ADMIN");
    if (response) return response;

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q");

    if (!q || q.length < 2) {
      return NextResponse.json(
        { error: "Otsisõna peab olema vähemalt 2 tähemärki" },
        { status: 400 }
      );
    }

    const dogs = await prisma.dog.findMany({
      where: {
        OR: [
          { nickName: { contains: q } },
          { officialName: { contains: q } },
          { handler: { handlerName: { contains: q } } },
        ],
      },
      include: {
        handler: {
          select: { id: true, handlerName: true, clubName: true },
        },
      },
      take: 20,
      orderBy: { nickName: "asc" },
    });

    return NextResponse.json(dogs);
  } catch {
    return NextResponse.json({ error: "Serveri viga" }, { status: 500 });
  }
}
