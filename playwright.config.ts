import { defineConfig, devices } from "@playwright/test";

// Safety net, not a full cross-browser matrix — Chromium only, covering
// the core flows (signup/login, onboarding, workout session, account
// deletion). NEXT_PUBLIC_E2E_TEST=1 is what makes the trainer skip the
// live camera phase — see src/lib/pose/test-mode.ts.
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 90_000,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
    actionTimeout: 15_000,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  // Production build, not `next dev` — Turbopack's dev mode lazily
  // compiles each route on first hit, which made a cold server flaky
  // against Playwright's per-test timeout (a full first-time flow like
  // signup → onboarding → dashboard could cold-compile half a dozen
  // routes). A production server has everything precompiled up front.
  //
  // Runs the actual `.next/standalone/server.js` artifact (via
  // `npm run start:standalone`, which depends on `postbuild` having
  // copied public/.next/static into it) — `next start` doesn't fully
  // support `output: "standalone"` (Next.js warns about this directly)
  // now that Phase 26 set it, and this way the suite tests the exact
  // thing Render deploys. In CI, ci.yml already runs `npm run build` as
  // its own step, so the webServer command here only needs to start it.
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: process.env.CI ? "npm run start:standalone" : "npm run build && npm run start:standalone",
        url: "http://localhost:3000/api/health",
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
        env: { NEXT_PUBLIC_E2E_TEST: "1" },
      },
});
