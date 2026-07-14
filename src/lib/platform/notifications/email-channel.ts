import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";
import type { NotificationChannel, NotificationPayload } from "./types";

function getTransport() {
  if (!process.env.SMTP_HOST) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

/** Mirrors `src/lib/email.ts`'s transport/dev-fallback pattern for
 *  transactional auth emails — kept as its own small transport rather
 *  than importing that file, since these are a different concern
 *  (product notifications vs. auth flows) with their own templates and
 *  no shared state. */
export class EmailNotificationChannel implements NotificationChannel {
  readonly name = "email";

  async send(payload: NotificationPayload): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { email: true },
    });
    if (!user) return;

    const transport = getTransport();
    if (!transport) {
      console.log(`\n📧 [DEV NOTIFICATION] To: ${user.email}\n   ${payload.title}\n   ${payload.body}\n`);
      return;
    }
    await transport.sendMail({
      from: process.env.SMTP_FROM || "FORGE <no-reply@forge.app>",
      to: user.email,
      subject: payload.title,
      html: `<p>${payload.body}</p>`,
    });
  }
}
