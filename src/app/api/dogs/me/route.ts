import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

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

    const dogs = await prisma.dog.findMany({
      where: { handlerId: handler.id },
      orderBy: { nickName: "asc" },
    });

    return NextResponse.json(dogs);
  } catch {
    return NextResponse.json({ error: "Serveri viga" }, { status: 500 });
  }
}
