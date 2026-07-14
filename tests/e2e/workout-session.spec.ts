import { test, expect } from "@playwright/test";
import { uniqueEmail, signUpAndVerify, login, completeOnboarding, deleteAccountByEmail, disconnectHelperClient, prisma } from "./helpers";

// Headless CI has no camera. NEXT_PUBLIC_E2E_TEST=1 (set in
// playwright.config.ts's webServer env) makes trainer-experience.tsx
// skip the live camera/pose-detection phase and complete with canned
// data instead — see src/lib/pose/test-mode.ts. This still exercises
// the real save-to-`/api/sessions` → summary-screen flow end-to-end.
test.describe("workout session", () => {
  const email = uniqueEmail("session");

  test.afterAll(async () => {
    await deleteAccountByEmail(email);
    await disconnectHelperClient();
  });

  test("starting and finishing a session saves real data and shows the summary", async ({ page }) => {
    // This page pulls in the trainer's full client bundle (tfjs/pose-
    // detection deps, even though test mode never runs them) — first-hit
    // load/hydrate is noticeably heavier than the other pages this suite
    // visits, so this one test gets extra room beyond the global timeout.
    test.setTimeout(150_000);

    await signUpAndVerify(page, email);
    await login(page, email);
    await completeOnboarding(page);

    await page.goto("/train/bench-press");

    // Test-mode short-circuits straight to the summary screen, whose own
    // effect (session-report.tsx) fires the real save to `/api/sessions`
    // on mount. "Session complete" renders immediately regardless of
    // whether that save has finished (session-report.tsx shows it
    // unconditionally, keeping local scores visible even if the save
    // fails) — wait for the response itself, not just the heading, or
    // this test can race ahead of the write and query the DB too early.
    const [sessionSaveResponse] = await Promise.all([
      page.waitForResponse((r) => r.url().includes("/api/sessions"), { timeout: 90_000 }),
      page.getByRole("button", { name: "Continue to camera setup" }).click(),
    ]);
    expect(sessionSaveResponse.ok()).toBe(true);
    await expect(page.getByText("Session complete")).toBeVisible();

    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    const sessions = await prisma.workoutSession.findMany({ where: { userId: user.id } });
    expect(sessions.length).toBeGreaterThan(0);
    expect(sessions[0].totalReps).toBeGreaterThan(0);
  });
});
