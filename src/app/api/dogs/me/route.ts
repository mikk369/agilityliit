import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const { session, response } = await requireAuth();
    if (response) return response;

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
