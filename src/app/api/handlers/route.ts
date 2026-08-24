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
