import type { Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

// Separate client instance (not the app's globalThis-pinned singleton —
// this file runs in the Playwright test process, not the Next.js server).
// Same `pgbouncer=true` fix as src/lib/prisma.ts — see that file's
// comment for why Neon's pooled endpoint needs it.
function datasourceUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url || url.includes("pgbouncer=") || !url.includes("-pooler.")) return url;
  return `${url}${url.includes("?") ? "&" : "?"}pgbouncer=true`;
}

export const prisma = new PrismaClient({ datasourceUrl: datasourceUrl() });

export function uniqueEmail(prefix: string): string {
  return `e2e-${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
}

export const TEST_PASSWORD = "e2eTestPass123";

/** Signs up, then reads the just-created EMAIL_VERIFY token directly
 *  from the DB (no SMTP is configured, so there's no inbox to check —
 *  this is the same shortcut used throughout this project's own manual
 *  smoke-testing) and visits the verify link, leaving the account ready
 *  to log in. */
export async function signUpAndVerify(page: Page, email: string, name = "E2E Test"): Promise<void> {
  await page.goto("/signup");
  await page.getByLabel("Full name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL(/\/(onboarding|dashboard)/);

  // Signup already creates a session, but login is blocked until
  // verified (Phase 15) — log out, verify, then the caller can log back in.
  await page.request.post("/api/auth/logout");

  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  const token = await prisma.token.findFirstOrThrow({
    where: { userId: user.id, type: "EMAIL_VERIFY" },
  });
  await page.goto(`/api/auth/verify?token=${token.token}`);
}

export async function login(page: Page, email: string, password = TEST_PASSWORD): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
}

/** Drives the real 7-step onboarding wizard (src/app/onboarding/page.tsx)
 *  through to the results screen and into the dashboard. Selectors match
 *  that file's actual field ids/option labels, not guessed ones. */
export async function completeOnboarding(page: Page): Promise<void> {
  await page.waitForURL("/onboarding");

  // Step 1 — basics
  await page.locator("#age").fill("28");
  await page.getByRole("button", { name: "Male", exact: true }).click();
  await page.getByRole("button", { name: "Continue" }).click();

  // Step 2 — body
  await page.locator("#height").fill("178");
  await page.locator("#weight").fill("78");
  await page.getByRole("button", { name: "Continue" }).click();

  // Step 3 — goal
  await page.getByRole("button", { name: "Build Muscle" }).click();
  await page.getByRole("button", { name: "Continue" }).click();

  // Step 4 — experience
  await page.getByRole("button", { name: "Beginner" }).click();
  await page.getByRole("button", { name: "Continue" }).click();

  // Step 5 — activity level
  await page.getByRole("button", { name: "Moderate" }).click();
  await page.getByRole("button", { name: "Continue" }).click();

  // Step 6 — location + equipment (equipment optional, skip)
  await page.getByRole("button", { name: "Home" }).click();
  await page.getByRole("button", { name: "Continue" }).click();

  // Step 7 — schedule (days/minutes already default to valid values).
  // `/api/onboarding` does several sequential Prisma writes
  // (profile upsert, progress entry, plan generation) — on a cold
  // server/DB connection this can take well past the default 15s
  // action timeout, so give the resulting "Enter your dashboard"
  // button (which only appears once that response lands) more room.
  await page.getByRole("button", { name: "Generate my plan" }).click();
  await page.getByRole("button", { name: "Enter your dashboard" }).click({ timeout: 45_000 });
  await page.waitForURL("/dashboard");
}

/** Deletes the account via the real API (mirrors what "Delete account"
 *  in Settings does) — used both as its own spec and as cleanup for
 *  other specs, so a failed run never leaves throwaway users behind. */
export async function deleteAccountByEmail(email: string): Promise<void> {
  await prisma.user.delete({ where: { email } }).catch(() => {});
}

export async function disconnectHelperClient(): Promise<void> {
  await prisma.$disconnect();
}
