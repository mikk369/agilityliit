import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

/**
 * Change your own password while signed in — the common case, no email needed.
 * The current password is required, so a borrowed session cannot lock the owner
 * out of their own account.
 */

const schema = z
  .object({
    currentPassword: z.string().min(1, "Praegune parool on kohustuslik"),
    password: z.string().min(6, "Parool peab olema vähemalt 6 tähemärki"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Paroolid ei kattu",
    path: ["confirmPassword"],
  });

export async function POST(req: Request) {
  try {
    const { session, response } = await requireAuth();
    if (response) return response;

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { currentPassword, password } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { id: parseInt(session.user.id) },
      select: { id: true, password: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Kasutajat ei leitud" }, { status: 404 });
    }

    if (!(await bcrypt.compare(currentPassword, user.password))) {
      return NextResponse.json(
        { error: "Praegune parool ei ole õige" },
        { status: 400 }
      );
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          password: await bcrypt.hash(password, 12),
          // Ends every session issued before this moment — including this one,
          // so the caller has to sign in again.
          passwordChangedAt: new Date(),
        },
      }),
      prisma.passwordResetToken.deleteMany({
        where: { userId: user.id, usedAt: null },
      }),
    ]);

    return NextResponse.json({ message: "Parool on muudetud" });
  } catch {
    return NextResponse.json({ error: "Serveri viga" }, { status: 500 });
  }
}
