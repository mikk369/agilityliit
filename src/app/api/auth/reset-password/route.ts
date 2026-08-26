import { NextResponse } from "next/server";
import { z } from "zod";
import { consumeResetToken } from "@/lib/password-reset";
import { rateLimit, clientIp } from "@/lib/rate-limit";

/** Set a new password using the token from the emailed link. */

const schema = z
  .object({
    token: z.string().min(1),
    password: z.string().min(6, "Parool peab olema vähemalt 6 tähemärki"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Paroolid ei kattu",
    path: ["confirmPassword"],
  });

export async function POST(req: Request) {
  try {
    // Guessing a 32-byte token is hopeless, but there is no reason to let
    // someone try at speed.
    if (!rateLimit(`reset:ip:${clientIp(req)}`, 20, 60 * 60 * 1000)) {
      return NextResponse.json(
        { error: "Liiga palju katseid. Proovi hiljem uuesti." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { token, password } = parsed.data;
    const ok = await consumeResetToken(token, password);

    if (!ok) {
      // Unknown, expired and already-used all look the same from out here.
      return NextResponse.json(
        { error: "Link on aegunud või juba kasutatud. Palun küsi uus." },
        { status: 400 }
      );
    }

    return NextResponse.json({ message: "Parool on muudetud" });
  } catch {
    return NextResponse.json({ error: "Serveri viga" }, { status: 500 });
  }
}
