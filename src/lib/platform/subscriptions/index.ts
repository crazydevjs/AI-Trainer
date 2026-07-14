import { eventBus } from "../events";
import { subscriptionStore } from "./store";
import { getPlanLimits } from "./plans";
import type { SubscriptionState } from "./types";

export type { PlanId, PlanDefinition, PlanLimits, SubscriptionState, SubscriptionStatus } from "./types";
export { PLANS, getPlanLimits } from "./plans";
export { subscriptionStore } from "./store";

export async function getSubscription(userId: string): Promise<SubscriptionState> {
  return subscriptionStore.get(userId);
}

export async function listSubscriptions(): Promise<SubscriptionState[]> {
  return subscriptionStore.list();
}

export async function setSubscription(state: SubscriptionState): Promise<void> {
  await subscriptionStore.set(state);
  eventBus.publish("subscription.changed", { userId: state.userId, planId: state.planId });
}

export async function getSubscriptionPlanLimits(userId: string) {
  const state = await subscriptionStore.get(userId);
  return getPlanLimits(state.planId);
}
