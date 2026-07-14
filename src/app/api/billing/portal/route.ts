import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getBillingProvider } from "@/lib/platform/billing";

export async function POST() {
  const session = await getSession();
  if (!session?.sub) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await prisma.subscription.findUnique({ where: { userId: session.sub } });
  if (!existing?.stripeCustomerId) {
    return NextResponse.json({ error: "No billing account yet — upgrade first" }, { status: 400 });
  }

  try {
    const { url } = await getBillingProvider().createPortalSession(existing.stripeCustomerId);
    return NextResponse.json({ ok: true, url });
  } catch (e) {
    console.error("billing portal error", e);
    return NextResponse.json({ error: "Couldn't open the billing portal" }, { status: 500 });
  }
}
