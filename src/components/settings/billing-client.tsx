"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, CreditCard, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { PlanDefinition, PlanId, SubscriptionStatus } from "@/lib/platform/subscriptions";

export function BillingClient({
  currentPlanId,
  status,
  plans,
}: {
  currentPlanId: PlanId;
  status: SubscriptionStatus;
  plans: PlanDefinition[];
}) {
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  async function upgrade(planId: PlanId) {
    if (planId === "free") return;
    setLoadingPlan(planId);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Couldn't start checkout");
        return;
      }
      window.location.assign(data.url);
    } catch {
      toast.error("Network error. Try again.");
    } finally {
      setLoadingPlan(null);
    }
  }

  async function manageBilling() {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Couldn't open billing portal");
        return;
      }
      window.location.assign(data.url);
    } catch {
      toast.error("Network error. Try again.");
    } finally {
      setPortalLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Link
        href="/settings"
        className="inline-flex items-center gap-2 text-sm text-fog transition-colors hover:text-chalk"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to settings
      </Link>

      <div className="flex items-center gap-2">
        <CreditCard className="h-6 w-6 text-ember" />
        <h1 className="font-display text-3xl font-bold uppercase tracking-wide">Billing</h1>
      </div>

      <div className="glass rounded-3xl p-6">
        <p className="flex items-center gap-2 text-sm text-fog">
          <Sparkles className="h-4 w-4 text-volt" />
          You have full access to every feature during the beta, regardless of plan. Upgrading
          below is in Stripe <b className="text-chalk">test mode</b> — no real charge.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        {plans.map((plan) => {
          const isCurrent = plan.id === currentPlanId;
          return (
            <div
              key={plan.id}
              className={`glass space-y-4 rounded-3xl p-6 ${isCurrent ? "border border-ember/40" : ""}`}
            >
              <div>
                <p className="text-xs uppercase tracking-widest text-smoke">{plan.name}</p>
                <p className="font-display mt-1 text-3xl font-bold text-chalk">
                  ${plan.priceUsdPerMonth}
                  <span className="text-sm font-normal text-smoke">/mo</span>
                </p>
              </div>
              <ul className="space-y-1.5 text-sm text-fog">
                <li>{plan.limits.aiRequestsPerMonth.toLocaleString()} AI requests/mo</li>
                <li>{plan.limits.workoutSessionsPerMonth.toLocaleString()} workout sessions/mo</li>
                <li>{Math.round(plan.limits.storageBytes / (1024 * 1024 * 1024))} GB storage</li>
              </ul>
              {isCurrent ? (
                <Button variant="outline" disabled className="w-full">
                  <Check className="h-4 w-4" />
                  Current plan ({status})
                </Button>
              ) : plan.id === "free" ? (
                <Button variant="ghost" disabled className="w-full">
                  Downgrade via billing portal
                </Button>
              ) : (
                <Button
                  className="w-full"
                  onClick={() => upgrade(plan.id)}
                  disabled={loadingPlan !== null}
                >
                  {loadingPlan === plan.id && <Loader2 className="h-4 w-4 animate-spin" />}
                  Upgrade to {plan.name}
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {currentPlanId !== "free" && (
        <Button variant="outline" onClick={manageBilling} disabled={portalLoading}>
          {portalLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          Manage billing
        </Button>
      )}
    </div>
  );
}
