import { randomUUID } from "crypto";
import type { BillingCustomer, BillingProvider, BillingSubscriptionStatus, CheckoutSessionResult } from "../types";

/** Local/dev billing provider — simulates a real provider well enough to
 *  exercise the rest of the billing/subscriptions/usage stack without
 *  Stripe or Razorpay credentials. Swap for a real `StripeBillingProvider`
 *  (implementing the same `BillingProvider` interface) once the `stripe`
 *  package is added as a dependency — nothing outside `billing/index.ts`
 *  needs to change. */
export class MemoryBillingProvider implements BillingProvider {
  readonly name = "memory";
  private customers = new Map<string, BillingCustomer>();
  private statuses = new Map<string, BillingSubscriptionStatus>();

  async createCustomer(email: string): Promise<BillingCustomer> {
    const customer: BillingCustomer = { id: randomUUID(), email };
    this.customers.set(customer.id, customer);
    this.statuses.set(customer.id, "none");
    return customer;
  }

  async createCheckoutSession(customerId: string, planId: string): Promise<CheckoutSessionResult> {
    this.statuses.set(customerId, "active");
    return { url: `/settings/billing/mock-checkout?customer=${customerId}&plan=${planId}` };
  }

  async createPortalSession(customerId: string): Promise<CheckoutSessionResult> {
    return { url: `/settings/billing?mock-portal=${customerId}` };
  }

  async cancelSubscription(customerId: string): Promise<void> {
    this.statuses.set(customerId, "canceled");
  }

  async getSubscriptionStatus(customerId: string): Promise<BillingSubscriptionStatus> {
    return this.statuses.get(customerId) ?? "none";
  }
}
