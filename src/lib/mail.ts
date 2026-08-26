import nodemailer, { type Transporter } from "nodemailer";

/**
 * Outgoing mail.
 *
 * The app sends none today — WordPress did it with `wp_mail`. Point this at the
 * same SMTP account the federation's site uses, so the agilityliit.ee domain's
 * SPF/DKIM keep applying and mail does not land in spam.
 *
 * Configure in `.env`:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM
 *
 * With nothing configured, sending throws instead of failing silently, and in
 * development the message is logged so the reset flow can be walked through
 * without a mail server.
 */

export interface Mail {
  to: string;
  subject: string;
  html: string;
  text: string;
}

let cached: Transporter | null = null;

function isConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM);
}

function transporter(): Transporter {
  if (cached) return cached;

  const port = Number(process.env.SMTP_PORT || 587);

  cached = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    // 465 is implicit TLS; 587 upgrades with STARTTLS.
    secure: port === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      : undefined,
  });

  return cached;
}

/**
 * Send one message. Throws when SMTP is not configured in production; in
 * development it logs the message and returns, so no mail server is needed.
 *
 * Never pass a password, token, or reset link to a logger from the caller —
 * the development fallback below is the only place a link may be printed.
 */
export async function sendMail(mail: Mail): Promise<void> {
  if (!isConfigured()) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SMTP is not configured (SMTP_HOST / SMTP_FROM)");
    }

    console.info(
      `[mail:dev] to=${mail.to} subject=${mail.subject}\n${mail.text}`
    );
    return;
  }

  await transporter().sendMail({
    from: process.env.SMTP_FROM,
    to: mail.to,
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
  });
}
