import { createHash, randomBytes } from "crypto";
import { hash as bcryptHash } from "bcryptjs";
import { prisma } from "./db";
import { sendMail } from "./mail";

/**
 * Password reset tokens.
 *
 * The token travels in the emailed link; only its sha256 hash is stored, so a
 * leaked database cannot be used to reset anyone's password. A token is valid
 * for one hour and one use.
 *
 * Both entry points — the user asking for a link, and an admin starting a reset
 * on their behalf — issue the same kind of token and mail it to the account's
 * own address. Neither returns the link to the caller.
 */

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
const BCRYPT_COST = 12; // same as sign-up

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function appUrl(): string {
  const url = process.env.PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "";
  return url.replace(/\/$/, "");
}

/**
 * Issue a token for a user and mail them the link.
 * Returns nothing — callers must not be able to learn the token.
 */
export async function sendResetLink(user: {
  id: number;
  name: string;
  email: string;
}): Promise<void> {
  const token = randomBytes(32).toString("hex");

  // One live link at a time: asking again invalidates the previous mail.
  await prisma.passwordResetToken.deleteMany({
    where: { userId: user.id, usedAt: null },
  });

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
    },
  });

  const link = `${appUrl()}/reset-password?token=${token}`;

  await sendMail({
    to: user.email,
    subject: "Eesti Agility Liit — parooli taastamine",
    text: [
      `Tere, ${user.name}!`,
      "",
      "Kellegi (loodetavasti sinu) soovil saab selle lingiga määrata uue parooli:",
      link,
      "",
      "Link kehtib ühe tunni ja seda saab kasutada üks kord.",
      "Kui sa parooli taastamist ei soovinud, võid selle kirja tähelepanuta jätta — parool jääb samaks.",
    ].join("\n"),
    html: `
      <p>Tere, ${escapeHtml(user.name)}!</p>
      <p>Kellegi (loodetavasti sinu) soovil saab selle lingiga määrata uue parooli:</p>
      <p><a href="${link}">${link}</a></p>
      <p>Link kehtib ühe tunni ja seda saab kasutada üks kord.</p>
      <p>Kui sa parooli taastamist ei soovinud, võid selle kirja tähelepanuta jätta — parool jääb samaks.</p>
    `,
  });
}

/**
 * Consume a token and set the new password.
 * Returns false for anything invalid — unknown, expired or already used —
 * without saying which, so the endpoint cannot be used to probe.
 */
export async function consumeResetToken(
  token: string,
  newPassword: string
): Promise<boolean> {
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
  });

  if (!record || record.usedAt || record.expiresAt < new Date()) return false;

  const password = await bcryptHash(newPassword, BCRYPT_COST);
  const now = new Date();

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      // passwordChangedAt ends sessions that were open before the reset.
      data: { password, passwordChangedAt: now },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: now },
    }),
    // Any other outstanding link for this user dies with it.
    prisma.passwordResetToken.deleteMany({
      where: { userId: record.userId, usedAt: null },
    }),
  ]);

  return true;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
