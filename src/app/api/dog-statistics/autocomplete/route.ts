import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/dog-statistics/autocomplete?field=dog_name&q=Rex
 *
 * Returns up to 15 autocomplete suggestions for the given field.
 * Allowed fields: dog_name, register_code, handler_name, judge
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const field = url.searchParams.get("field") || "";
    const query = url.searchParams.get("q") || "";

    if (query.length < 1) {
      return NextResponse.json([]);
    }

    const allowedFields = ["dog_name", "register_code", "handler_name", "judge"];
    if (!allowedFields.includes(field)) {
      return NextResponse.json({ error: "Vigane väli" }, { status: 400 });
    }

    let suggestions: string[] = [];

    switch (field) {
      case "dog_name": {
        const dogs = await prisma.dog.findMany({
          where: { nickName: { contains: query } },
          select: { nickName: true },
          distinct: ["nickName"],
          orderBy: { nickName: "asc" },
          take: 15,
        });
        suggestions = dogs.map((d) => d.nickName);
        break;
      }
      case "register_code": {
        const dogs = await prisma.dog.findMany({
          where: {
            registerCode: { contains: query },
            NOT: { registerCode: null },
          },
          select: { registerCode: true },
          distinct: ["registerCode"],
          orderBy: { registerCode: "asc" },
          take: 15,
        });
        suggestions = dogs
          .map((d) => d.registerCode)
          .filter((r): r is string => !!r);
        break;
      }
      case "handler_name": {
        const handlers = await prisma.handler.findMany({
          where: {
            handlerName: { contains: query },
          },
          select: { handlerName: true },
          distinct: ["handlerName"],
          orderBy: { handlerName: "asc" },
          take: 15,
        });
        suggestions = handlers.map((h) => h.handlerName);
        break;
      }
      case "judge": {
        const tracks = await prisma.competitionTrack.findMany({
          where: {
            referee: { contains: query },
            NOT: { referee: null },
          },
          select: { referee: true },
          distinct: ["referee"],
          orderBy: { referee: "asc" },
          take: 15,
        });
        suggestions = tracks
          .map((t) => t.referee)
          .filter((r): r is string => !!r);
        break;
      }
    }

    return NextResponse.json(suggestions);
  } catch (e) {
    console.error("Autocomplete error:", e);
    return NextResponse.json({ error: "Serveri viga" }, { status: 500 });
  }
}
