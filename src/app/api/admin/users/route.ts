import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

/** Users list for /admin/users. Never returns the password hash. */
export async function GET(req: Request) {
  try {
    const { response } = await requireRole("ADMIN");
    if (response) return response;

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim();
    const role = searchParams.get("role")?.trim();

    const users = await prisma.user.findMany({
      where: {
        ...(role ? { role: role as "ADMIN" | "ORGANIZER" | "COMPETITOR" } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search } },
                { email: { contains: search } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: [{ role: "asc" }, { name: "asc" }],
      take: 200,
    });

    return NextResponse.json(users);
  } catch {
    return NextResponse.json({ error: "Serveri viga" }, { status: 500 });
  }
}
