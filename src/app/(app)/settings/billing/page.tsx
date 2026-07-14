import { getCurrentUser } from "@/lib/auth";
import { getSubscription, PLANS } from "@/lib/platform/subscriptions";
import { BillingClient } from "@/components/settings/billing-client";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const subscription = await getSubscription(user.id);

  return (
    <BillingClient
      currentPlanId={subscription.planId}
      status={subscription.status}
      plans={Object.values(PLANS)}
    />
  );
}
