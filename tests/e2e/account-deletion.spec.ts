import { test, expect } from "@playwright/test";
import { uniqueEmail, signUpAndVerify, login, completeOnboarding, TEST_PASSWORD, deleteAccountByEmail, disconnectHelperClient, prisma } from "./helpers";

test.describe("account deletion", () => {
  const email = uniqueEmail("delete");

  test.afterAll(async () => {
    // Safety net if the test fails before the account actually gets
    // deleted through the UI — never leave a throwaway user behind.
    await deleteAccountByEmail(email);
    await disconnectHelperClient();
  });

  test("deleting an account requires the correct password, then removes it", async ({ page }) => {
    await signUpAndVerify(page, email);
    await login(page, email);
    await completeOnboarding(page);

    await page.goto("/settings");
    await page.getByRole("button", { name: "Delete account" }).click();
    await page.getByLabel(/enter your password to confirm/i).fill("wrong-password");
    await page.getByRole("button", { name: "Permanently delete my account" }).click();
    await expect(page.getByText(/incorrect password/i)).toBeVisible();

    await page.getByLabel(/enter your password to confirm/i).fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Permanently delete my account" }).click();
    await page.waitForURL("/login*");

    const user = await prisma.user.findUnique({ where: { email } });
    expect(user).toBeNull();
  });
});
