import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

/**
 * Change a user's role.
 *
 * Two guards, both enforced here rather than in the UI: an admin cannot change
 * their own role, and the last remaining admin cannot be demoted — an app with
 * no admins can only be repaired with database access
 * (`npx tsx scripts/set-role.ts <email> ADMIN`).
 */

const schema = z.object({
  role: z.enum(["ADMIN", "ORGANIZER", "COMPETITOR"]),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, response } = await requireRole("ADMIN");
    if (response) return response;

    const { id } = await params;
    const userId = parseInt(id);

    if (Number.isNaN(userId)) {
      return NextResponse.json({ error: "Vigane kasutaja" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Vigane roll" }, { status: 400 });
    }

    const { role } = parsed.data;

    if (userId === parseInt(session.user.id)) {
      return NextResponse.json(
        { error: "Oma rolli muuta ei saa" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Kasutajat ei leitud" }, { status: 404 });
    }

    if (user.role === "ADMIN" && role !== "ADMIN") {
      const admins = await prisma.user.count({ where: { role: "ADMIN" } });
      if (admins <= 1) {
        return NextResponse.json(
          { error: "Viimast administraatorit ei saa eemaldada" },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, name: true, email: true, role: true },
    });

    // Who changed whom, so a role change is never a mystery later.
    console.info(
      `[role] ${session.user.email} changed ${user.email}: ${user.role} -> ${role}`
    );

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Serveri viga" }, { status: 500 });
  }
}
