import { test, expect } from "@playwright/test";
import { uniqueEmail, login, deleteAccountByEmail, disconnectHelperClient, TEST_PASSWORD, prisma } from "./helpers";

test.describe("auth", () => {
  const email = uniqueEmail("auth");

  test.afterAll(async () => {
    await deleteAccountByEmail(email);
    await disconnectHelperClient();
  });

  test("signup blocks login until verified, then verifying unblocks it", async ({ page }) => {
    await page.goto("/signup");
    await page.getByLabel("Full name").fill("Auth Test");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Create account" }).click();
    await page.waitForURL(/\/(onboarding|dashboard)/);

    // Log out, then confirm a fresh login is refused pre-verification.
    await page.request.post("/api/auth/logout");
    await login(page, email);
    await expect(page.getByText(/verify your email/i)).toBeVisible();

    // Verify via the DB token (no SMTP configured in dev/test — this is
    // the same shortcut used throughout this project's manual testing).
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    const token = await prisma.token.findFirstOrThrow({ where: { userId: user.id, type: "EMAIL_VERIFY" } });
    await page.goto(`/api/auth/verify?token=${token.token}`);

    await login(page, email);
    await page.waitForURL(/\/(onboarding|dashboard)/);
  });

  test("logout clears the session", async ({ page }) => {
    await login(page, email);
    await page.waitForURL(/\/(onboarding|dashboard)/);
    await page.request.post("/api/auth/logout");
    await page.goto("/dashboard");
    await page.waitForURL("/login*");
  });
});
