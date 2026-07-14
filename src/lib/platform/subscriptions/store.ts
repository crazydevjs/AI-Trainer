import { prisma } from "@/lib/prisma";
import type { SubscriptionState, SubscriptionStatus } from "./types";
import type { SubscriptionStatus as PrismaSubscriptionStatus } from "@prisma/client";

const TO_APP_STATUS: Record<PrismaSubscriptionStatus, SubscriptionStatus> = {
  ACTIVE: "active",
  TRIALING: "trialing",
  PAST_DUE: "past_due",
  CANCELED: "canceled",
};
const TO_DB_STATUS: Record<SubscriptionStatus, PrismaSubscriptionStatus> = {
  active: "ACTIVE",
  trialing: "TRIALING",
  past_due: "PAST_DUE",
  canceled: "CANCELED",
};

/** Prisma-backed subscription-state store (Phase 21 — previously an
 *  in-memory Map, see git history). Every unknown user defaults to an
 *  active free plan without a DB row until they actually subscribe. */
class SubscriptionStore {
  async get(userId: string): Promise<SubscriptionState> {
    const row = await prisma.subscription.findUnique({ where: { userId } });
    if (!row) return { userId, planId: "free", status: "active", currentPeriodEnd: null };
    return {
      userId: row.userId,
      planId: row.planId as SubscriptionState["planId"],
      status: TO_APP_STATUS[row.status],
      currentPeriodEnd: row.currentPeriodEnd ? row.currentPeriodEnd.getTime() : null,
    };
  }

  async set(state: SubscriptionState): Promise<void> {
    await prisma.subscription.upsert({
      where: { userId: state.userId },
      create: {
        userId: state.userId,
        planId: state.planId,
        status: TO_DB_STATUS[state.status],
        currentPeriodEnd: state.currentPeriodEnd ? new Date(state.currentPeriodEnd) : null,
      },
      update: {
        planId: state.planId,
        status: TO_DB_STATUS[state.status],
        currentPeriodEnd: state.currentPeriodEnd ? new Date(state.currentPeriodEnd) : null,
      },
    });
  }

  async setStripeIds(userId: string, stripeCustomerId: string, stripeSubscriptionId?: string): Promise<void> {
    await prisma.subscription.upsert({
      where: { userId },
      create: { userId, stripeCustomerId, stripeSubscriptionId },
      update: { stripeCustomerId, stripeSubscriptionId },
    });
  }

  async findByStripeCustomerId(stripeCustomerId: string): Promise<SubscriptionState | null> {
    const row = await prisma.subscription.findUnique({ where: { stripeCustomerId } });
    if (!row) return null;
    return {
      userId: row.userId,
      planId: row.planId as SubscriptionState["planId"],
      status: TO_APP_STATUS[row.status],
      currentPeriodEnd: row.currentPeriodEnd ? row.currentPeriodEnd.getTime() : null,
    };
  }

  async list(): Promise<SubscriptionState[]> {
    const rows = await prisma.subscription.findMany();
    return rows.map((row) => ({
      userId: row.userId,
      planId: row.planId as SubscriptionState["planId"],
      status: TO_APP_STATUS[row.status],
      currentPeriodEnd: row.currentPeriodEnd ? row.currentPeriodEnd.getTime() : null,
    }));
  }
}

export const subscriptionStore = new SubscriptionStore();
