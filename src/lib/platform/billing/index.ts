import { MemoryBillingProvider } from "./providers/memory-provider";
import { StripeBillingProvider } from "./providers/stripe-provider";
import type { BillingProvider } from "./types";

export type { BillingCustomer, CheckoutSessionResult, BillingSubscriptionStatus, BillingProvider } from "./types";
export { MemoryBillingProvider } from "./providers/memory-provider";
export { StripeBillingProvider } from "./providers/stripe-provider";

const globalForBilling = globalThis as unknown as { platformBillingProvider?: BillingProvider };

/** Returns the active billing provider: Stripe (test mode) if
 *  `STRIPE_SECRET_KEY` is set, otherwise the in-memory mock — so local
 *  dev without Stripe credentials keeps working unchanged. */
export function getBillingProvider(): BillingProvider {
  if (!globalForBilling.platformBillingProvider) {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    globalForBilling.platformBillingProvider = stripeKey
      ? new StripeBillingProvider(stripeKey)
      : new MemoryBillingProvider();
  }
  return globalForBilling.platformBillingProvider;
}
