import { test, expect } from "@playwright/test";
import { uniqueEmail, signUpAndVerify, login, completeOnboarding, deleteAccountByEmail, disconnectHelperClient } from "./helpers";

test.describe("onboarding", () => {
  const email = uniqueEmail("onboarding");

  test.afterAll(async () => {
    await deleteAccountByEmail(email);
    await disconnectHelperClient();
  });

  test("completing onboarding lands on the dashboard with a greeting", async ({ page }) => {
    await signUpAndVerify(page, email);
    await login(page, email);
    await completeOnboarding(page);

    await expect(page).toHaveURL("/dashboard");
    await expect(page.getByText(/Good morning|Good afternoon|Good evening/)).toBeVisible();
  });
});
