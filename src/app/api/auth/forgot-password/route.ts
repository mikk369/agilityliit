import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { sendResetLink } from "@/lib/password-reset";
import { rateLimit, clientIp } from "@/lib/rate-limit";

/**
 * Ask for a password reset link.
 *
 * Always answers the same way whether or not the address belongs to an account:
 * a different answer would turn this into a way to find out who is a member.
 */

const schema = z.object({
  email: z.string().email(),
});

// Deliberately vague and identical in every case.
const ANSWER = {
  message:
    "Kui selle e-posti aadressiga konto on olemas, saatsime parooli taastamise lingi.",
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);

    // Even a malformed address gets the standard answer.
    if (!parsed.success) return NextResponse.json(ANSWER);

    const email = parsed.data.email.toLowerCase().trim();

    // Per address, and per caller: one stops mail-bombing one inbox, the other
    // stops walking a list of addresses.
    const withinLimits =
      rateLimit(`forgot:email:${email}`, 3, 60 * 60 * 1000) &&
      rateLimit(`forgot:ip:${clientIp(req)}`, 10, 60 * 60 * 1000);

    if (!withinLimits) return NextResponse.json(ANSWER);

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true },
    });

    if (user) await sendResetLink(user);

    return NextResponse.json(ANSWER);
  } catch {
    // Even a failure here must not distinguish a real address from a fake one.
    return NextResponse.json(ANSWER);
  }
}
