import Stripe from "stripe";
import type { BillingCustomer, BillingProvider, BillingSubscriptionStatus, CheckoutSessionResult } from "../types";
import type { PlanId } from "../../subscriptions/types";

const STRIPE_STATUS_MAP: Record<Stripe.Subscription.Status, BillingSubscriptionStatus> = {
  active: "active",
  trialing: "trialing",
  past_due: "past_due",
  canceled: "canceled",
  incomplete: "none",
  incomplete_expired: "none",
  unpaid: "past_due",
  paused: "canceled",
};

/** Maps a plan id to its Stripe test-mode Price id via env vars — the
 *  user hasn't created real Stripe products yet, so these are read
 *  lazily (not at module load) and a missing mapping surfaces as a clear
 *  error rather than a silent no-op checkout. */
function priceIdFor(planId: string): string {
  const key = `STRIPE_PRICE_${planId.toUpperCase()}`;
  const priceId = process.env[key];
  if (!priceId) {
    throw new Error(`No Stripe Price id configured for plan "${planId}" (set ${key} in .env)`);
  }
  return priceId;
}

/** Stripe test-mode billing provider — implements the same
 *  provider-agnostic `BillingProvider` interface as `MemoryBillingProvider`,
 *  so nothing outside `billing/index.ts` needs to know which is active.
 *  Selected automatically when `STRIPE_SECRET_KEY` is set (see
 *  `billing/index.ts`); falls back to the memory provider otherwise, so
 *  local dev without Stripe credentials keeps working unchanged. */
export class StripeBillingProvider implements BillingProvider {
  readonly name = "stripe";
  private stripe: Stripe;

  constructor(secretKey: string) {
    this.stripe = new Stripe(secretKey);
  }

  async createCustomer(email: string): Promise<BillingCustomer> {
    const customer = await this.stripe.customers.create({ email });
    return { id: customer.id, email };
  }

  async createCheckoutSession(customerId: string, planId: string): Promise<CheckoutSessionResult> {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const session = await this.stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceIdFor(planId), quantity: 1 }],
      success_url: `${appUrl}/settings/billing?checkout=success`,
      cancel_url: `${appUrl}/settings/billing?checkout=canceled`,
      metadata: { planId },
    });
    if (!session.url) throw new Error("Stripe did not return a checkout URL");
    return { url: session.url };
  }

  async createPortalSession(customerId: string): Promise<CheckoutSessionResult> {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const session = await this.stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appUrl}/settings/billing`,
    });
    return { url: session.url };
  }

  async cancelSubscription(customerId: string): Promise<void> {
    const subs = await this.stripe.subscriptions.list({ customer: customerId, status: "active", limit: 1 });
    const sub = subs.data[0];
    if (sub) await this.stripe.subscriptions.cancel(sub.id);
  }

  async getSubscriptionStatus(customerId: string): Promise<BillingSubscriptionStatus> {
    const subs = await this.stripe.subscriptions.list({ customer: customerId, limit: 1 });
    const sub = subs.data[0];
    return sub ? STRIPE_STATUS_MAP[sub.status] : "none";
  }

  /** Verifies the webhook signature and returns the parsed event —
   *  callers must never trust an unverified request body as a real
   *  Stripe event. */
  constructEvent(payload: string | Buffer, signature: string, webhookSecret: string): Stripe.Event {
    return this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  }

  /** Best-effort mapping from a Stripe Price id back to our internal
   *  plan id, via the same env vars `priceIdFor` reads — used by the
   *  webhook handler, which only has the Stripe-side price id to go on. */
  planIdForPrice(priceId: string): PlanId | null {
    for (const planId of ["free", "pro", "elite"] as const) {
      if (process.env[`STRIPE_PRICE_${planId.toUpperCase()}`] === priceId) return planId;
    }
    return null;
  }
}
