import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { sendResetLink } from "@/lib/password-reset";

/**
 * Start a password reset on a user's behalf, for the member who phones an admin
 * instead of using the "forgot password" form.
 *
 * The link is mailed to the user's own address and is never returned here, so
 * an admin can help someone back in without being able to enter as them.
 */
export async function POST(
  _req: Request,
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

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Kasutajat ei leitud" }, { status: 404 });
    }

    await sendResetLink(user);

    console.info(`[reset] ${session.user.email} sent a reset link to ${user.email}`);

    return NextResponse.json({
      message: `Parooli taastamise link saadeti aadressile ${user.email}`,
    });
  } catch {
    return NextResponse.json(
      { error: "Lingi saatmine ebaõnnestus" },
      { status: 500 }
    );
  }
}
