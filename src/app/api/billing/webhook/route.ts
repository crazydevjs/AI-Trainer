import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { StripeBillingProvider } from "@/lib/platform/billing/providers/stripe-provider";
import { subscriptionStore } from "@/lib/platform/subscriptions";
import { auditLog } from "@/lib/platform/audit";

const STRIPE_TO_APP_STATUS: Record<Stripe.Subscription.Status, "active" | "trialing" | "past_due" | "canceled"> = {
  active: "active",
  trialing: "trialing",
  past_due: "past_due",
  canceled: "canceled",
  incomplete: "past_due",
  incomplete_expired: "canceled",
  unpaid: "past_due",
  paused: "canceled",
};

/** Stripe test-mode webhook. Never trusts the request body until the
 *  signature is verified against STRIPE_WEBHOOK_SECRET — an unverified
 *  POST here could otherwise let anyone grant themselves a paid plan. */
export async function POST(req: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secretKey || !webhookSecret) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 501 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const rawBody = await req.text();
  const provider = new StripeBillingProvider(secretKey);

  let event: Stripe.Event;
  try {
    event = provider.constructEvent(rawBody, signature, webhookSecret);
  } catch (e) {
    console.error("stripe webhook signature verification failed", e);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const checkoutSession = event.data.object as Stripe.Checkout.Session;
        const customerId = checkoutSession.customer as string;
        const planId = checkoutSession.metadata?.planId;
        const existing = await subscriptionStore.findByStripeCustomerId(customerId);
        if (existing && planId) {
          await subscriptionStore.set({ ...existing, planId: planId as "pro" | "elite", status: "active" });
          auditLog.record({ action: "billing.checkout_completed", actorId: existing.userId, metadata: { planId } });
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const stripeSub = event.data.object as Stripe.Subscription;
        const customerId = stripeSub.customer as string;
        const existing = await subscriptionStore.findByStripeCustomerId(customerId);
        if (existing) {
          const priceId = stripeSub.items.data[0]?.price.id;
          const planId = priceId ? provider.planIdForPrice(priceId) ?? existing.planId : existing.planId;
          const status =
            event.type === "customer.subscription.deleted"
              ? "canceled"
              : STRIPE_TO_APP_STATUS[stripeSub.status];
          await subscriptionStore.set({
            ...existing,
            planId,
            status,
            currentPeriodEnd: stripeSub.items.data[0]?.current_period_end
              ? stripeSub.items.data[0].current_period_end * 1000
              : existing.currentPeriodEnd,
          });
          auditLog.record({ action: "billing.subscription_updated", actorId: existing.userId, metadata: { planId, status } });
        }
        break;
      }
      default:
        break;
    }
  } catch (e) {
    console.error("stripe webhook handling error", e);
    return NextResponse.json({ error: "Webhook handling failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
