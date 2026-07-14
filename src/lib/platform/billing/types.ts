export interface BillingCustomer {
  id: string;
  email: string;
}

export interface CheckoutSessionResult {
  url: string;
}

export type BillingSubscriptionStatus = "active" | "trialing" | "past_due" | "canceled" | "none";

/** Provider-agnostic billing surface. A real provider (Stripe, Razorpay)
 *  implements this same interface — no dependency on either SDK is taken
 *  here since neither is installed yet (see Known limitations). */
export interface BillingProvider {
  name: string;
  createCustomer(email: string): Promise<BillingCustomer>;
  createCheckoutSession(customerId: string, planId: string): Promise<CheckoutSessionResult>;
  createPortalSession(customerId: string): Promise<CheckoutSessionResult>;
  cancelSubscription(customerId: string): Promise<void>;
  getSubscriptionStatus(customerId: string): Promise<BillingSubscriptionStatus>;
}
