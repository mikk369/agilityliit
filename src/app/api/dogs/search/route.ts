import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Autentimata" }, { status: 401 });
    }
    if (session.user.role !== "ORGANIZER" && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Keelatud" }, { status: 403 });
    }

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
