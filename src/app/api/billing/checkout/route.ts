import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getBillingProvider } from "@/lib/platform/billing";
import { subscriptionStore } from "@/lib/platform/subscriptions";
import { rateLimit, RATE_LIMIT_PRESETS } from "@/lib/platform/rate-limiter";

const bodySchema = z.object({ planId: z.enum(["pro", "elite"]) });

function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

/** Creates (or reuses) a Stripe customer for the current user, then a
 *  Checkout Session for the requested plan. Test-mode only for the v1
 *  Beta — see StripeBillingProvider. Falls back to the mock provider's
 *  fake checkout URL if STRIPE_SECRET_KEY isn't set. */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.sub) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = rateLimit("billing:checkout", clientIp(req), RATE_LIMIT_PRESETS.auth);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many attempts — try again shortly" }, { status: 429 });
  }

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.sub } });
  if (!user) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  try {
    const provider = getBillingProvider();
    const existing = await prisma.subscription.findUnique({ where: { userId: user.id } });

    let customerId = existing?.stripeCustomerId;
    if (!customerId) {
      const customer = await provider.createCustomer(user.email);
      customerId = customer.id;
      await subscriptionStore.setStripeIds(user.id, customerId);
    }

    const { url } = await provider.createCheckoutSession(customerId, parsed.data.planId);
    return NextResponse.json({ ok: true, url });
  } catch (e) {
    console.error("billing checkout error", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Couldn't start checkout" },
      { status: 500 }
    );
  }
}
