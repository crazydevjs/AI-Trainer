import { NextResponse } from "next/server";
import { getSession, destroySession, bumpTokenVersion } from "@/lib/auth";
import { auditLog } from "@/lib/platform/audit";

/** Bumps tokenVersion (revoking every outstanding session JWT for this
 *  user, on every device) and also signs this device out, matching the
 *  "log out everywhere" name — not "log out everywhere else". */
export async function POST() {
  const session = await getSession();
  if (!session?.sub) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await bumpTokenVersion(session.sub);
  await destroySession();
  auditLog.record({ action: "auth.logout_everywhere", actorId: session.sub });

  return NextResponse.json({ ok: true });
}
