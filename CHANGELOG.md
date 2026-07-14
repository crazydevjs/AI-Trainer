# Changelog

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## Unreleased — Phase 27: Release Checklist & Cutover

The final phase of the "AI Trainer v1 Beta" production-hardening push
(Phases 15–27). No new AI engines were added across any of these 13
phases; nothing in `src/lib/pose/{rep-counter,state-machine,form-rules,
calibration}.ts` or the `form-engine/`/`movement-engine/`/
`injury-risk-engine/`/`performance/`/`personalization/`/
`exercise-intelligence/` trees was touched (see `ALGORITHM.md`'s new
closing section for the one adjacent exception — Phase 17's ESLint
cleanup of the trainer *hook and UI*, not the engines).

### Added
- `docs/RELEASE_CHECKLIST.md` — code quality, database, environment
  variables, Render service setup, a full post-deploy smoke-test list,
  monitoring/rollback confirmation, and an explicit "deliberately
  accepted gaps" section (no real payments, most of `.data/` resets on
  redeploy, no API-route try/catch sweep, CI/Render not yet exercised
  for real) so these read as decisions, not oversights.

### Changed — final documentation sweep
- `README.md`: Roadmap section's item 17 (Admin panel) marked done and
  described accurately; new item 18 summarizing the entire v1 Beta push;
  Tech Stack table gained Billing/Testing/Deployment rows; Verification
  Status section updated with ESLint/Playwright/standalone-build results;
  Useful Scripts table gained `start:standalone`/`lint`/`test:e2e`.
- `DEVELOPER_GUIDE.md`: new "Running the Playwright E2E suite" and
  "Deploying to Render" sections.
- `ALGORITHM.md`: corrected a now-stale "no real payment provider exists"
  line (Phase 21 added Stripe test-mode billing) and added a closing
  section confirming zero algorithm changes across Phases 15–27.
- `SYSTEM_ARCHITECTURE.md`, `docs/ROADMAP.md`: kept current phase-by-phase
  throughout rather than saved for this final sweep (see each phase's own
  entry above) — `ROADMAP.md`'s "In progress" header changed to "Shipped"
  now that all 13 phases are done.

### Verification
- Final full-suite run, all green: `tsc --noEmit`, `npm run build`
  (`postbuild` → complete standalone bundle), `npx eslint .` (zero
  problems), `npx playwright test` (5/5 specs, against the exact
  standalone artifact Render will run).
- Two items remain outside what could be verified in this session, both
  named explicitly in `docs/RELEASE_CHECKLIST.md`: real CI secrets
  (`DATABASE_URL_TEST`/`JWT_SECRET_TEST`/`SIGNING_SECRET_TEST`) were
  never added, and the app was never deployed to a real Render account —
  neither was available this session. Everything upstream of those two
  items (all application code, all local verification) is done.

## Unreleased — Phase 26: Render Deployment Prep

### Added
- `next.config.ts`: `output: "standalone"` — Render (and most non-Vercel
  hosts) run a plain `node server.js`, not `next start`.
- `scripts/copy-standalone-assets.ts` + a `postbuild` npm script —
  standalone output deliberately excludes `public/` and `.next/static/`
  (Next's own documented behavior); this copies them in automatically on
  every build using Node's `fs.cpSync` (not a shell `cp -r`, so it works
  identically on Render's Linux build image and a developer's Windows
  machine). `npm run start:standalone` added for local testing of the
  exact artifact Render will run.
- `package.json`: `engines.node: ">=20 <23"` — pins the Node version for
  Render's buildpack selection (previously unset).
- `.env.example`: added the three previously-undocumented-but-used env
  vars (`NEXT_PUBLIC_CDN_URL`, `FEATURE_FLAGS_JSON`, `LOG_LEVEL`) —
  these were flagged as a gap back in this session's original research
  but never actually added until now.
- `docs/DEPLOYMENT.md` — full Render setup: build/start commands, health
  check path, the complete env var checklist (required vs. optional),
  the persistent-disk `.data/` durability table, first-deploy steps
  (seed, promote an admin, register the Stripe webhook), and rollback
  notes.
- `SYSTEM_ARCHITECTURE.md`: new "Deployment" section recording the
  standalone-output asset-copying requirement and the `.data/`
  durability reasoning at an architectural level (full table lives in
  `docs/DEPLOYMENT.md`).

### Changed
- `playwright.config.ts`'s `webServer` now runs
  `npm run start:standalone` instead of `npm run start` — `next start`
  emits a direct warning that it doesn't fully support
  `output: "standalone"` (introduced by this phase), so the E2E suite
  now runs against the exact artifact Render deploys instead.

### Verification
- `tsc --noEmit`, `npm run build` (confirmed `postbuild` runs
  automatically and produces a complete `.next/standalone/`), `eslint .`
  all clean.
- Re-ran the full Playwright suite (all 5 specs) against the corrected
  `start:standalone` command — all pass, zero warnings.
- **Actually ran the standalone server** (`node .next/standalone/
  server.js`) locally after a real build, twice — once with a manual
  asset copy, once relying purely on the new automatic `postbuild` step
  — and confirmed in both cases: `/api/health` returns a real DB-checked
  200, a real page (`/login`) returns 200 with the expected content, and
  static assets serve correctly. This is the one part of this phase with
  genuine risk of silent breakage (a missing `public/`/`.next/static/`
  copy), so it was verified by actually running it, not just trusting
  the build output.
- **Not deployed to a real Render service this session** — no Render
  account access was available. Everything above is real, working local
  verification of the exact artifact Render will run; the Render-side
  steps (creating the service, attaching the persistent disk, adding env
  vars, registering the Stripe webhook) are documented in
  `docs/DEPLOYMENT.md` for the user to execute directly.

## Unreleased — Phase 25: Crash Reporting Completion

### Added
- `src/components/app/crash-reporter.tsx` — global `window.onerror`/
  `unhandledrejection` handlers, mounted once in the root layout
  (`src/app/layout.tsx`), reporting to the existing
  `POST /api/observability/errors`. Closes the one real gap in Phase 14's
  error-groups pipeline: `error.tsx`/`global-error.tsx` only ever catch
  errors thrown during React's render, so an error inside an async
  callback, event handler, or an unhandled Promise rejection was
  previously invisible to crash reporting entirely.
- No per-route `error.tsx` wiring needed this phase — Phase 18's audit
  found the app still only has the root `(app)/error.tsx` +
  `global-error.tsx` pair (deliberately not building per-route ones,
  see that phase's notes), and both already reported to this endpoint
  before this session started.
- Recommendation, not re-litigated: the existing `error-groups` pipeline
  (fingerprinting, occurrence counts, first/last-seen, consumed by the
  admin dashboard built in Phase 22) is sufficient crash reporting at
  100-user beta scale now that capture is complete (this phase) and
  durable (Phase 26's persistent disk) — no Sentry-equivalent needed for
  v1 Beta.

### Verification
- `tsc --noEmit`, `npm run build`, `eslint .` all clean.
- Manually verified end-to-end: POSTed a synthetic error report (the
  same shape `CrashReporter` sends), confirmed it appears — fingerprinted,
  counted — in `GET /api/observability/status`'s `topErrors`, which is
  exactly what the Phase 22 admin dashboard renders.

## Unreleased — Phase 24: Testing Infrastructure (Playwright E2E + CI)

This project's first automated tests and first CI pipeline, ever.

### Added
- `@playwright/test`, `playwright.config.ts` — Chromium only (a safety
  net, not a cross-browser matrix), running against a **production
  build** (`npm run build && npm run start`, not `next dev` —
  Turbopack's dev mode lazily compiles each route on first hit, which
  made a cold server flaky against per-test timeouts; a production
  server has everything precompiled up front).
- `src/lib/pose/test-mode.ts` — `isE2ETestMode()` (gated on
  `NEXT_PUBLIC_E2E_TEST=1`, a dedicated env var set only by Playwright's
  `webServer` config, never true in real dev/production) and
  `buildCannedSessionResult()`. Headless CI has no camera, so
  `trainer-experience.tsx`'s "Continue to camera setup" click skips
  straight to a canned-but-plausible `SessionResult` and the report
  screen when in test mode — the real `RepCounter`/pose engines are
  never touched by this, and the canned result still flows through the
  real `/api/sessions` save, so the E2E spec genuinely exercises that
  path end-to-end.
- `tests/e2e/{helpers,auth,onboarding,workout-session,account-deletion}
  .spec.ts` — the four core flows from the plan. Each spec creates a
  throwaway account (unique per run) and cleans it up in `afterAll`
  (`account-deletion.spec.ts` also has this as a safety net in case the
  test fails before the UI-driven deletion happens) — no dedicated test
  database was available this session, so these are self-cleaning
  against the real dev database rather than relying on a full reset.
- `.github/workflows/ci.yml` — typecheck → lint → `prisma db push` (this
  project has no migration history, see Phase 15) → seed → build →
  Playwright install → E2E, gated behind `DATABASE_URL_TEST`/
  `JWT_SECRET_TEST`/`SIGNING_SECRET_TEST` repo secrets (**must point at a
  dedicated test database — `db push` overwrites its schema on every
  run**). Not yet exercised on a real PR since these secrets aren't
  configured in this session.
- `npm run test:e2e` script.

### Fixed (real bugs found by writing and running these tests)
- Two Playwright locator collisions caught during authoring, not app
  bugs: `getByRole("button", { name: "Log in" })` also matched "Log in
  with Google" (substring match); `{ name: "Male" }` also matched
  "Fe**male**" for the same reason. Both fixed with `exact: true` in the
  test helpers — no app code involved.
- A genuine test-ordering bug (in the test, not the app): the
  account-deletion spec navigated straight to `/settings` after login
  without completing onboarding first — `src/proxy.ts`'s middleware
  correctly redirects any non-onboarded user to `/onboarding` for every
  non-public path, so the test just needed to call the same
  `completeOnboarding()` helper the other specs use.
- **A real production fix, found while chasing what first looked like
  E2E flakiness**: `src/lib/prisma.ts` now appends `pgbouncer=true` to
  the datasource URL automatically when it detects a Neon `-pooler`
  endpoint and the flag isn't already present. Neon's pooled endpoint
  runs PgBouncer in transaction-pooling mode, which doesn't preserve
  prepared-statement state across a session the way a direct connection
  does — Prisma's own docs call for this flag whenever a pooled endpoint
  is used. Without it, rapid successive writes-then-reads (exactly what
  a signup → onboarding → dashboard flow does) can occasionally produce
  spurious `P2003`/"record not found" errors on rows committed moments
  earlier. This affects the real app in production too, not just tests,
  since the app's own `DATABASE_URL` already points at the same
  `-pooler` endpoint.
- The remaining apparent "flakiness" chased down before that fix turned
  out to be ordinary cold-start latency (first hit to a fresh server/DB
  connection is slow) rather than a bug at all — fixed by extending
  specific waits (`completeOnboarding()`'s final step,
  `workout-session.spec.ts`'s save-then-verify) rather than by masking a
  real problem with a blanket retry.
- `workout-session.spec.ts` itself had a race in its **own** assertion
  logic (not the app): it checked the database for a saved
  `WorkoutSession` row immediately after the "Session complete" heading
  appeared, but that heading renders unconditionally in
  `session-report.tsx` regardless of whether the async save to
  `/api/sessions` has actually finished. Fixed by waiting for the real
  network response before querying the database.

### Verification
- All 5 specs pass reliably against the real dev database (`npx
  playwright test`, production build, Chromium) — confirmed cleanly
  after each fix above, with zero leftover throwaway accounts afterward.
- CI itself has **not** been run for real (no GitHub Actions secrets
  configured this session) — `ci.yml` is written and the local
  equivalent of every step in it has been run manually, but the actual
  workflow needs `DATABASE_URL_TEST`/`JWT_SECRET_TEST`/
  `SIGNING_SECRET_TEST` added as repo secrets (pointing at a dedicated
  test database, not the real dev one) before it will go green on a
  real PR.

## Unreleased — Phase 23: Performance Pass

### Changed
- `next.config.ts`: added `images.remotePatterns` for
  `lh3.googleusercontent.com` (Google OAuth profile pictures — the only
  external image source in the app).
- `sidebar.tsx`, `profile/page.tsx`: converted the two raw `<img>` avatar
  usages (previously carrying an `eslint-disable @next/next/no-img-element`
  each) to `next/image` — automatic optimization/resizing, and removes
  the last two lint-disable comments of that kind in the codebase.

### Assessed, no change needed
- `@tensorflow/tfjs`/`@tensorflow-models/pose-detection`: already
  dynamically imported inside `use-pose-trainer.ts`'s mount effect
  (`await import(...)`), not part of the main bundle — confirmed by
  reading the code, not by a bundler size report (see below).
- N+1 queries: audited every route added in Phases 20–22
  (`account/*`, `billing/*`, `admin/users`) — all use `Promise.all` with
  direct/batched Prisma queries, no per-item query loops.
- Suspense/streaming: already addressed in Phase 18 (route-local
  `loading.tsx` on the highest-traffic pages).
- Bundle size: this Next.js 16/Turbopack build doesn't print a per-route
  "First Load JS" size table the way older webpack builds did, and
  `@next/bundle-analyzer` isn't installed — a genuine size breakdown
  wasn't produced this phase. Worth adding if a real performance issue
  ever surfaces, not done speculatively here.
- Caching (`src/lib/platform/cache`): no read-heavy, rarely-changing
  query was found in this pass that would clearly benefit — the exercise
  library (the obvious candidate) is already a single indexed query, not
  a bottleneck at this scale.

### Verification
- `tsc --noEmit`, `npm run build`, `eslint .` all clean.
- **Not independently verified with a real Lighthouse/DevTools trace or a
  live camera-session framerate check** — no browser automation was
  available in this environment.

## Unreleased — Phase 22: Admin Analytics Dashboard

Satisfies "add analytics dashboards" mostly by exposing and securing
Phase 11/14 work already built, not by adding new analytics engines —
consistent with "do not add new AI engines."

### Added
- `GET /api/admin/users` — the one genuinely new read this phase: a
  paginated per-user list (email, role, plan, onboarded/verified status,
  join date), which none of the existing Developer dashboards expose
  (they're aggregate-only). Also folds in Phase 14's business-analytics
  functions (`getWorkoutCompletionStats`, `getExercisePopularity`,
  `getCoachUsageStats`, `getPersonalizationAdoptionStats`) since
  `getObservabilityStatus()`'s aggregate payload doesn't include them.
- `src/app/(app)/admin/page.tsx` — replaced the `<ComingSoon>` stub with a
  real dashboard: health score, active-alert count, DAU/WAU/MAU,
  completion rate, coach/personalization adoption, most-popular
  exercises, top errors, and the new paginated users table. Already
  server-side gated by `src/proxy.ts`'s existing `role !== "ADMIN"`
  middleware check (confirmed still in place) and now also consumes the
  Phase 16-hardened `GET /api/observability/status`.

### Verification
- `tsc --noEmit`, `npm run build`, `eslint .` all clean.
- Manually verified against a real (throwaway) ADMIN account: `/admin`
  renders real data (including the actual account holder's own user row,
  confirming it reads the real dev database, not mock data); `/api/admin/
  users` returns correctly paginated, real results.

## Unreleased — Phase 21: Subscriptions & Billing Scaffolding (Stripe Test Mode)

Per product decision: real charging deferred to post-beta. Everyone gets
full access during the beta regardless of plan — this phase builds the
data model + Stripe test-mode integration as a rehearsal, not an active
paywall.

### Added
- `Subscription` Prisma model (`userId` unique, `planId`, `status` enum,
  `stripeCustomerId`/`stripeSubscriptionId`, `currentPeriodEnd`,
  `onDelete: Cascade`). Migrated `src/lib/platform/subscriptions/store.ts`
  off its in-memory `Map` onto this table — the store's own doc comment
  already named this as the intended follow-up.
- `src/lib/platform/billing/providers/stripe-provider.ts` — implements the
  existing provider-agnostic `BillingProvider` interface (zero interface
  changes needed beyond adding `createPortalSession`, mirrored on
  `MemoryBillingProvider` too) using the `stripe` npm package, test-mode
  only. `getBillingProvider()` (`billing/index.ts`) now picks Stripe if
  `STRIPE_SECRET_KEY` is set, else keeps the in-memory mock — local dev
  without Stripe credentials is unaffected.
- `POST /api/billing/checkout`, `POST /api/billing/portal`,
  `POST /api/billing/webhook` (verifies the Stripe signature via
  `constructEvent` before trusting anything in the body — an unverified
  webhook could otherwise let anyone grant themselves a paid plan) and
  `src/app/(app)/settings/billing/page.tsx` (plan comparison, upgrade CTA,
  manage-billing link).
- `.env.example`: `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`,
  `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_ELITE`.

### Changed
- `getSubscription`/`setSubscription`/`listSubscriptions`/
  `getSubscriptionPlanLimits` (`src/lib/platform/subscriptions/index.ts`)
  are now `async` (Prisma-backed instead of synchronous in-memory reads).
  Two real call sites updated (`api/platform/status/route.ts`,
  `usage/enforcement.ts`'s `checkQuota` — which itself has zero callers
  anywhere in the app yet, confirmed by grep, so this was a safe,
  contained change).

### Verification
- `tsc --noEmit`, `npm run build`, `eslint .` all clean.
- Manually smoke-tested against a real (throwaway) account with **no
  Stripe keys configured** (mock provider path): `/settings/billing`
  renders the plan comparison; `POST /api/billing/checkout` returns the
  mock provider's fake checkout URL and correctly persists a
  `stripeCustomerId` to the new `Subscription` table (confirmed via a
  direct DB query); `/api/platform/status` (now awaiting the newly-async
  subscription functions) still returns the correct data.
- **The real Stripe test-mode checkout → webhook → plan-upgrade path was
  NOT verified in this session** — no Stripe test-mode credentials were
  available. Once real keys are added to `.env` (see the new
  `.env.example` comments for exactly what's needed, including creating
  test Products/Prices in the Stripe dashboard), verify with the Stripe
  CLI: `stripe listen --forward-to localhost:3000/api/billing/webhook`,
  then complete a checkout with a Stripe test card and confirm the
  `Subscription` row updates and the billing page reflects the new plan.

## Unreleased — Phase 20: Account Management & Deletion

### Added
- `bumpTokenVersion()` (`src/lib/auth.ts`) — shared helper wrapping the
  `tokenVersion` increment used by password change, "log out everywhere",
  and account deletion, all built on Phase 15's revocation mechanism.
- `POST /api/account/change-password` — requires the current password
  (skipped for Google-only accounts with no `passwordHash`, which instead
  *sets* one), bumps `tokenVersion` (revoking every other session) then
  re-issues a fresh session for the current device only.
- `POST /api/account/delete` — password re-confirmation (or typed-email
  confirmation for Google-only accounts with no password), then
  `prisma.user.delete()` — immediate hard delete per product decision, no
  grace period. Schema's cascade relations make this a single call with
  no manual child-table cleanup (verified: `PersonalBest.workoutSessionId`
  is the only `SetNull`, `PersonalBest.userId` still cascades).
- `POST /api/auth/logout-everywhere` — bumps `tokenVersion` and signs the
  current device out too (the name says "everywhere", not "everywhere
  else").
- `src/app/(app)/settings/page.tsx` + `src/components/settings/
  settings-client.tsx` — replaced the `<ComingSoon>` stub with a real
  Profile / Security / Danger Zone settings page.
- `changePasswordSchema`, `deleteAccountSchema` (`src/lib/validators.ts`).

### Verification
- `tsc --noEmit`, `npm run build`, `eslint .` all clean.
- Full manual smoke test against a real (throwaway) account on a local
  dev server: wrong-current-password rejected; correct change succeeds
  and the *current* device's session keeps working (freshly reissued)
  while the old password stops working for login and the new one works;
  `logout-everywhere` signs the current device out too; account deletion
  rejects a wrong password, succeeds with the right one, destroys the
  session, and a follow-up direct DB query confirms the user row (and by
  cascade, all owned data) is fully gone.

## Unreleased — Phase 19: Accessibility & Responsiveness

Targeted fixes for the real, screen-reader-blocking gaps found by an
Explore-agent audit across the app (not an exhaustive per-page pass —
prioritized the highest-traffic surfaces).

### Changed
- `role="alert"` added to the 7 react-hook-form/zod field-error `<p>`
  elements across `login`, `signup`, `reset-password`, `forgot-password` —
  previously validation errors appeared visually with no screen-reader
  announcement.
- `exercise-picker.tsx`/`explorer.tsx` search inputs, `planner.tsx`'s
  title/description fields — added `aria-label`/`htmlFor`+`id`
  associations where there was visual-only labeling or none at all.
- `sidebar.tsx`/`profile/page.tsx` avatar `<img>`: `alt=""` → a real
  descriptive alt (was previously marked decorative despite conveying the
  user's identity).
- `settings/developer/history/page.tsx`'s favorite/delete icon buttons:
  added `aria-label`.
- `live-session.tsx`'s full-screen "tap a person to lock on" layer and
  `sidebar.tsx`'s mobile-menu backdrop: added `aria-hidden="true"` — both
  are pointer-only shortcuts over an already-keyboard-accessible button
  (the sidebar's "Close menu" button, the trainer's "Lock me in"/lock
  button), so hiding them from assistive tech is more honest than making
  them falsely appear as focusable controls with no sensible non-visual
  target.
- Responsiveness: spot-checked — `sidebar.tsx` already has a mobile
  top-bar/drawer variant, `weekly-chart.tsx` already uses Recharts'
  `ResponsiveContainer`, and responsive Tailwind prefixes (`sm:`/`lg:`)
  are already used pervasively throughout. No fundamental gap found; no
  changes made here.

### Not fixed this phase (lower priority / dev-only)
- `settings/developer/history/page.tsx`'s own search/filter inputs and
  `trainer-experience.tsx`'s dev-only session-tag inputs remain unlabeled
  — both gated behind `isDevUnlocked()`, not reachable by regular users.
- Stepper `+`/`−` buttons (`trainer-experience.tsx`, `builder.tsx`) have a
  visible glyph (not screen-reader-invisible) but an ambiguous one;
  left as a minor nice-to-have.

### Verification
- `tsc --noEmit`, `npm run build`, `eslint .` all clean.
- **Not independently verified with a real screen reader or a live
  multi-viewport browser check** — no browser automation was available in
  this environment. Recommend a keyboard-only walkthrough (signup →
  onboarding → dashboard → settings) and a resize check on
  dashboard/workout/settings before relying on this phase as fully done.

## Unreleased — Phase 18: UX Foundations (Loading / Empty States)

### Added
- `src/components/ui/skeleton.tsx` — `Skeleton`, `SkeletonCard`, `SkeletonRow`
  primitives matching the existing `(app)/loading.tsx` pulsing-block style.
- `src/components/ui/empty-state.tsx` — `<EmptyState icon title description
  action />`, extracted from the pattern previously hand-duplicated in
  `profile/history/page.tsx`. Applied to `workouts/page.tsx` and
  `profile/history/page.tsx`'s empty-list states.
- `useDevUnlocked()` (`src/lib/dev.ts`) — see Phase 17, also relevant here
  since it's what let the Developer dashboards drop their manual
  loading-flicker workaround.
- Route-local `loading.tsx` for `dashboard`, `profile`, `profile/history`,
  `profile/history/[id]`, `workouts`, `exercises` — previously only the
  `(app)` route-group root had one, so every navigation showed that
  generic skeleton (a reasonable but generic shape) instead of a
  page-shaped one.

### Assessed, not changed
- API route error-handling audit: ~30 routes (mostly read-only GET status/
  performance/personalization endpoints) have no explicit `try/catch`,
  relying on Next.js's default 500 response plus the client's existing
  generic-error toast on a fetch failure. This is acceptable, not a
  correctness bug, for a beta launch — a full mechanical try/catch sweep
  across every route was judged lower-value than the phases still ahead
  (Stripe, testing, deployment) and was not done this phase.
- `exercises/page.tsx`'s empty state (a dev-setup "run `npm run db:seed`"
  message) and `profile/page.tsx`'s "No profile data yet" fallback were
  left as-is — the former is a developer-only setup message no real user
  should ever see once the DB is seeded, the latter an edge case with no
  meaningful CTA.

### Verification
- `tsc --noEmit`, `npm run build`, `eslint .` all clean.
- Manually verified against a real (throwaway) account: `/workouts` and
  `/profile/history` render the new `<EmptyState>` correctly with zero
  saved workouts/logs; `/dashboard`, `/profile`, `/exercises` all render
  200 with the new page-shaped `loading.tsx` in place.

## Unreleased — Phase 17: ESLint Zero-Warnings & Technical Debt Cleanup

Fixed the full pre-existing baseline (51 problems — 47 errors, 4 warnings,
none in protected engine files) down to zero, repo-wide.

### Changed
- `src/lib/jwt.ts`/`secrets.ts`/render-purity-adjacent fixes aside, the
  bulk of this phase is React-Compiler-readiness lint fixes:
  `src/components/trainer/use-pose-trainer.ts` — the three prop-mirror
  writes (`facingRef`/`runningRef`/`onEventRef`, feeding the long-lived
  `requestAnimationFrame` loop) moved from direct render-body writes into
  small `useEffect`s; the `smootherRef` lazy-init guard changed from
  `!ref.current` to the lint's own blessed `ref.current == null` form.
  Zero change to pose/rep-counting logic itself.
- `src/components/trainer/live-session.tsx` (the largest single file in
  this pass): `startTs`/`coach` refs now lazily initialized correctly;
  `currentWeightRef`/`hudRef` mirror-writes and the dev-HUD FPS/inference
  sparkline history moved into effects; the "just completed a rep" flash
  (previously `Date.now() - lastRepFlash.current < 700` read every render)
  now driven by real `justCompleted` state + a token-guarded `setTimeout`
  so rapid reps correctly extend the flash instead of racing; the
  in-set rep counter's baseline (`setStartCount` ref) is now real state;
  the `finished` guard is now dual-tracked — `finishedRef` stays a ref for
  synchronous same-tick re-entrancy guarding inside `finish()`, while a new
  `finished` state variable drives the `usePoseTrainer({ running })` prop,
  since reading a ref directly in the render body is exactly what this
  rule disallows. A handful of `useEffect`s that react to a value crossing
  a threshold (rest countdown reaching 0, the dev-HUD sparkline buffers)
  keep a scoped, commented `eslint-disable-next-line
  react-hooks/set-state-in-effect` — restructuring them to avoid the
  effect entirely would have either broken the rest screen's "skip"
  button or added new timer machinery under time pressure for a cosmetic
  dev-only graph; both are called out inline with the reasoning.
- `src/components/trainer/camera-guide.tsx`: the countdown-reaches-zero →
  `cancelCountdown()` + `onReady()` transition moved from a `useEffect`
  watching `countdown` state into the `setInterval` callback that ticks it
  down (mirrors the same fix pattern, and this one had no external
  "force to zero" trigger to preserve, unlike live-session's rest timer).
- `src/components/trainer/session-report.tsx`: `sidRef`'s one-time ID
  generation moved into a mount effect (was an impure `Date.now()` call
  evaluated on every render).
- `src/components/trainer/trainer-experience.tsx`: kept the camera/unit
  preference restore in an effect (scoped disable) rather than a lazy
  `useState` initializer, since this component is SSR'd from a Server
  Component — an eager `localStorage` read would diverge the client's
  first paint from the server-rendered HTML.
- Six `/settings/developer/*` pages: new `useDevUnlocked()` hook
  (`src/lib/dev.ts`, via `useSyncExternalStore`) replaces each page's own
  `useEffect` + `setState` dev-unlock check — hydration-safe by
  construction, and removes duplicated logic across all six pages.
- `dashboard/page.tsx`: two `Date.now()` calls in a Server Component now
  reuse one `todayMs` computed once per request instead of calling it
  fresh at each site.
- `src/components/ui/input.tsx`, `src/lib/mediapipe-stub.ts`,
  `src/lib/pose/model-select.ts` (renamed `use3DFor` → `needs3D`, since it
  isn't a hook), `prisma/data/exercises.ts` (removed a stale
  eslint-disable) — small mechanical fixes.

### Verification
- `tsc --noEmit`, `npm run build`, `eslint .` all clean (0 problems,
  down from the 51-problem baseline).
- **Not independently verified with a real camera session in this
  session** — no browser/camera automation was available in this
  environment. The changes were reviewed by hand line-by-line and are
  scoped entirely to *when* refs/state are read or written, never to the
  rep-counting/pose math itself, but a real gym-session check (camera on,
  a few reps, HUD, rest screen, PR badge) is recommended before treating
  this phase as fully verified.

## Unreleased — Phase 16: Admin/Internal Access Control

### Added
- `requireAdmin()` (`src/lib/auth.ts`) — 401 if unauthenticated, 403 if
  `role !== "ADMIN"`, otherwise returns the session. Used by every
  internal status/control route below.
- `src/app/(app)/settings/developer/layout.tsx` — server-side gate for the
  whole Developer dashboard family. Previously these six pages only
  checked `localStorage["forge:dev"]` client-side, which any authenticated
  user could set themselves; a non-admin now gets blocked before any of
  the page's own code (or its now-admin-gated API calls) ever runs, once
  `NODE_ENV === "production"`. The `NODE_ENV !== "production"` dev-unlock
  is preserved unchanged for local work.

### Changed
- **The single highest-severity finding from this session's research**:
  `POST /api/observability/rollouts` previously accepted a start/advance/
  rollback action from *any* authenticated user — meaning any beta user
  could mutate a live feature-flag rollout on the running instance. Now
  gated by `requireAdmin()`.
- `GET /api/{platform,mlops,validation,observability}/status` — same
  fix: previously any authenticated user, now admin-only.

### Verification
- Manually confirmed end-to-end against a `NODE_ENV=production` build with
  two real accounts (one `USER`, one promoted to `ADMIN`): the four status
  routes and the rollouts route return 403 for the `USER` account and 200
  for the `ADMIN` account; the `/settings/developer` page's server-rendered
  payload contains the layout's own block message with no reference to the
  real page component for the `USER` account, versus a real client-component
  reference for the `ADMIN` account (confirmed by diffing the RSC flight
  payloads, since both render similar-looking HTML text otherwise).

## Unreleased — Phase 15: Authentication & Session Security Hardening

First phase of the "AI Trainer v1 Beta" production-hardening push (Phases
15–27) — closing real, concrete security gaps found by direct code
inspection before exposing the app to 100 real users. No AI engines
touched.

### Added
- `User.tokenVersion` (Prisma migration via `db push`, matching this
  project's existing schema-sync convention — no `prisma/migrations/`
  history exists) — embedded in the session JWT, re-checked against the DB
  on every `getSession()` call. Bumping it (password change, "log out
  everywhere", account deletion — wired in a later phase) instantly
  revokes every outstanding session for that user.
- `POST /api/auth/resend-verification` — enumeration-safe, rate-limited
  resend of the email-verification link.
- `POST /api/auth/google/link` + `/login/link-google` page — the
  password-confirmation step for linking a Google identity to an existing
  password account (see Changed, below).
- `src/lib/google-link.ts` — short-lived (5 min) signed token carrying a
  pending Google identity across the link-confirmation redirect; nothing
  persisted server-side for it.
- Security headers (`next.config.ts` `headers()`): HSTS,
  `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and a CSP
  scoped to what the app needs (TF.js/WASM, camera blob URLs).

### Changed
- `src/lib/jwt.ts`, `src/lib/platform/security/secrets.ts`: `JWT_SECRET`
  and `SIGNING_SECRET` now fail closed (`requireEnv`, throws at boot) in
  production instead of silently falling back to a hardcoded dev secret.
  Dev fallback unchanged for local convenience.
- `POST /api/auth/login`: now 403s with `code: "EMAIL_NOT_VERIFIED"` if the
  account hasn't verified its email, instead of allowing login regardless.
- `POST /api/auth/signup`, `POST /api/auth/forgot-password`: now
  rate-limited (previously only login was), each on its own sub-bucket so
  one endpoint's abuse can't exhaust another's quota for the same IP.
- `GET /api/auth/google` / `.../callback`: added an OAuth `state` param
  (short-lived httpOnly cookie, verified on callback) closing an OAuth CSRF
  gap.
- `GET /api/auth/google/callback`: **no longer silently links** a Google
  sign-in to an existing password account on email match (an
  account-takeover vector — anyone who controls a victim's email address
  could previously complete Google OAuth and gain access). Now requires
  password confirmation via the new link flow above.

### Compatibility
- Existing users default to `tokenVersion: 0` (matches new sessions'
  initial value) — no forced logout from this migration itself.
- No CSRF-token middleware was added; `sameSite=lax` on the session cookie
  plus the new OAuth `state` param cover the identified attack surface.
  Documented in `SYSTEM_ARCHITECTURE.md`.

## Unreleased — Phase 14: AI Observability & Experimentation Platform

### Added
- `src/lib/observability/` — 19 modules explaining how the AI behaves in
  production, detecting regressions early, and safely rolling out
  improvements. Never participates in inference; builds heavily on
  Phase 11 (telemetry/metrics/monitoring/feature-flags) and Phase 12
  (statistics/metrics) rather than duplicating them.
- **Distributed Tracing** (`trace/`): every `POST /api/sessions` and
  `POST /api/workout-logs` request now gets a trace id. The four
  pose-layer engines (Rep/Form/Movement/Risk) get *presence* spans
  (zero duration — their timing is never transmitted to the server, only
  their final output); the Performance and Personalization Engines get
  *real* timed spans wrapping their actual server-side execution.
  Verified by hand end-to-end (start → presence spans → timed span → end
  → reload from disk).
- **Production Analytics** (`analytics/`): workout completion rate,
  average session duration, exercise popularity, coach usage (real
  signal: non-null `WorkoutLog.summary`), personalization adoption (real
  signal: `UserLearningProfile` row count), and AI accuracy (reuses
  Phase 12's `loadLatestReport()`) — all real Prisma queries, verified
  against this project's own dev database.
- **User Analytics** (`retention/`, `cohorts/`, `heatmaps/`,
  `usage-analytics/`): DAU/WAU/MAU and streak stats from real
  `WorkoutSession.startedAt`; weekly signup cohorts × week-N retention;
  a day-of-week × hour-of-day usage heatmap; an onboarding funnel
  (signed up → onboarded → first session → repeat session). All verified
  against real data (2 users, 40 sessions) — no fabricated numbers.
- **Cost Dashboard** (`cost/`): aggregates Phase 11's `usage/` tracker
  across every user for LLM/compute line items (both genuinely $0 — no
  LLM is integrated, `src/lib/coach.ts` is fully local) and walks
  `.data/storage/` on disk for a real storage-cost estimate. Placeholder
  rates, clearly labeled per line item.
- **Latency Dashboard** (`latency/`): aggregates real API-level timing
  (now recorded via `telemetry.recordTiming()` in the two session routes)
  and real per-engine timing (from trace spans) plus real local-storage
  timing (`storage/local-provider.ts` now wraps `put`/`get`); explicitly
  reports "not instrumented" (never a fabricated number) for
  database/queue/streaming/coach latency.
- **Error Intelligence** (`error-groups/`, `crash-analysis/`): SHA-256
  fingerprint-based error grouping; `POST /api/observability/errors`
  (unauthenticated, rate-limited by IP) wired into both
  `src/app/(app)/error.tsx` and `src/app/global-error.tsx`, the app's
  existing (previously report-nothing) error boundaries.
- **Health Monitoring** (`health/`): a composite 0-100 health score over
  platform/providers/storage/queues/jobs/notifications, reusing Phase 11's
  DB+cache checks; "not-configured" (no LLM provider, no SMTP) counts as
  passing, not failing.
- **Alerting** (`alerts/`): evaluates all seven stated conditions
  (regression, latency, cost-spike, provider-outage, crash-spike,
  queue-failure, storage-failure) against real current state; two of the
  seven (provider-outage in particular) can't fire yet since no external
  provider exists to fail — documented, not hidden.
- **Live Experiment Platform** (`ab-testing/`, `experiments/`,
  `rollouts/`, `feature-impact/`) — distinct from Phase 13's offline,
  dataset-based experiment tracking: deterministic variant assignment
  (same hash-bucketing style as Phase 11 feature-flags, generalized to N
  weighted variants), shadow evaluation, a full experiment lifecycle
  (draft → running → completed) with outcome recording and naive
  (≥30-sample, no significance test) winner selection, and a rollout
  state machine that genuinely drives Phase 11's live
  `featureFlagStore` — verified by hand, including a real bug this
  testing caught and fixed (see Compatibility).
- New `POST /api/observability/rollouts` — unlike the CLI (a separate
  process, can't reach a running server's in-memory flag state, see Known
  limitations), this route executes *inside* the live server process, so
  it genuinely changes rollout percentages for real traffic on that
  instance.
- Developer dashboard: new `/settings/developer/observability` page —
  System Health, Experiment Status, Current Rollouts, Latency, Cost,
  Alerts, Errors, Retention, Feature Usage, backed by
  `GET /api/observability/status`.
- CLI: `observability:status`, `experiments:create`, `experiments:compare`,
  `rollout:start` (also advances an existing active rollout — one command
  covers both), `rollout:stop`, `alerts:test`, `cost:report`,
  `health:report`.

### Fixed
- **`selectWinner()` could crown the wrong variant.** Manual smoke
  testing (simulating a 60-user A/B split) caught this: filtering out
  variants below the minimum sample size, then picking from what's left,
  meant a small-sample variant with a *better* mean got silently excluded
  and the sole remaining (worse) variant won by default. Fixed to require
  *every* variant to clear the sample-size bar before declaring any
  winner — "not enough data" beats a premature, wrong call.

### Compatibility
- **Zero changes** to `rep-counter.ts`, `state-machine.ts`,
  `form-rules.ts`, `calibration.ts` — same boundary as every prior phase.
- **Zero changes** to any file under `form-engine/`, `movement-engine/`,
  `injury-risk-engine/`, `performance/`, `personalization/`, or
  `exercise-intelligence/`.
- **`import "server-only"` removed from all of `src/lib/platform/`**
  (46 files, Phase 11). Discovered while wiring `health/`/`cost/`/
  `rollouts/` (which must run from both API routes and CLI scripts, like
  Phase 12/13's own trees) that `"server-only"` isn't a real installed
  package — it only resolves inside Next's bundler, so any CLI script
  importing anything from `platform/` failed with `Cannot find module
  'server-only'`. Purely a marker removal; zero runtime behavior change.
- Additive-only touches to already-shipped files: `POST /api/sessions`
  and `POST /api/workout-logs` gained trace spans + one timing call each
  (wrapping existing logic, not changing it); `error.tsx`/
  `global-error.tsx` gained one `fetch()` call each in their existing
  `useEffect`; `storage/local-provider.ts`'s `put`/`get` gained a timing
  wrapper around their existing bodies.
- Runs entirely offline/asynchronously — nothing in this phase adds
  synchronous work to the pose loop, the render loop, or blocks a
  request's response; trace/timing calls are fire-and-forget-adjacent
  (awaited, but add microseconds, not perceptible latency).
- No new Prisma models or migrations — this phase only *reads* existing
  tables (`User`, `WorkoutSession`, `WorkoutLog`) for analytics; its own
  data (traces, error groups, alerts, experiments, rollouts) is file-based
  under `.data/observability/`.

## Unreleased — Phase 13: AI Training & Continuous Improvement Platform

### Added
- `src/lib/mlops/` — 17 offline-only modules governing *releases* of the
  AI stack, built on top of Phase 12's validation framework: versioning,
  model-registry, dataset-registry, golden-datasets, quality-score,
  drift-detection, benchmark-registry, experiment-tracker,
  evaluation-pipeline, regression-detector, release-gates,
  release-manager, deployment-history, human-review, feedback-pipeline,
  active-learning, metrics-dashboard. Zero changes to any AI engine's
  runtime behavior.
- **Model Registry**: tracks a version string per component (Rep/Form/
  Movement/Risk Engine, thresholds, exercise catalog, prompt version,
  calibration, validation, release) — seeded at 1.0.0, since nothing in
  this codebase carried a real semver before now. File-based, with an
  append-only history log per component.
- **Dataset Registry**: coverage reports (exercise/camera-angle/device/
  lighting/difficulty distribution, contributors, a composite quality
  score) over Phase 12 datasets — difficulty is read straight from
  Exercise Intelligence's catalog (Phase 10), not a second taxonomy.
  Video resolution isn't captured anywhere in the debug export, so that
  distribution is always empty (documented, not fabricated).
- **Golden Datasets**: immutable (by convention + checksum, not a
  physical write-lock) benchmark datasets every release is checked
  against — SHA-256 checksum over sorted entries, `verifyGoldenChecksum()`
  detects drift/tampering after promotion.
- **Drift Detection**: Population Stability Index for categorical
  dimensions (exercise mix, camera angle, device, lighting — conventional
  thresholds: <0.1 none, 0.1–0.25 moderate, >0.25 significant) and a
  normalized mean-shift check for continuous dimensions (workout
  duration, movement speed — the latter approximated as reps/second,
  documented as a proxy since no direct velocity metric exists at the
  session level).
- **Regression Detection**: compares a release candidate's reports
  against up to three baselines at once (previous release / golden
  dataset / latest production), reusing Phase 12's `compareExerciseReports`
  — accuracy/count-error regressions are "critical," latency/FPS
  regressions are "warning."
- **Release Gates**: the six stated criteria (accuracy ≥ previous,
  latency ≤ threshold, memory ≤ threshold, no critical regressions,
  golden dataset passes, validation suite passes) each as one named,
  inspectable check. The memory check always passes with a note — nothing
  in this app samples memory usage anywhere today.
- **Release Manager**: a `ReleaseCandidate` record moving through
  candidate → approved/rejected → deployed, snapshotting the model
  registry at creation time; `approveRelease()` refuses a failing gate
  result unless explicitly forced; `deployRelease()` also bumps the
  model registry's `release` component.
- **Deployment History**: an append-only deploy/rollback event log,
  separate from the release's own status field so a deployed release can
  later be rolled back without losing that it *was* deployed.
- **Human Review Queue**: approval/correction/notes/labels/confidence/
  reviewer, and — the actual point of it — submitting a "corrected"
  review with a `trueRepCount` writes a real `GroundTruthLabel` (Phase 12)
  immediately usable by the next benchmark run. Verified end-to-end in
  manual smoke testing (feedback → review queue → correction → ground
  truth updated in place).
- **Feedback Pipeline**: collects false positive/negative, incorrect
  coaching/recommendation/exercise-detection reports; `feedback:sync`
  routes session-linked entries into the human-review queue. New
  `POST /api/feedback` — the one end-user-facing surface added this
  phase (no UI built for it yet, see Known limitations).
- **Active Learning**: prioritizes *unlabeled* sessions using only
  signals the app already records — average confidence from log samples,
  rejected/total rep ratio (a proxy for "high disagreement"), in-dataset
  exercise frequency, and Exercise Intelligence catalog coverage (a
  session whose exercise has no biomechanics profile yet is flagged
  "new-movement-pattern") — plus regression-case sessions when supplied.
  Verified in manual smoke testing to correctly rank an uncatalogued
  exercise above two catalogued-but-rare ones.
- **Metrics Dashboard** (data layer) + Developer dashboard: new
  `/settings/developer/mlops` page — Dataset Status, Golden Dataset,
  Release Candidates, Quality Score, Regression Status, Drift Alerts,
  backed by `GET /api/mlops/status`.
- **CLI**: `npm run dataset:import|validate`, `release:create|compare|
  approve`, `feedback:sync`, `drift:check`, `quality:report` — see
  `DEVELOPER_GUIDE.md` "Running the AI Training & Continuous Improvement
  Platform".
- `Experiment` (Phase 12, `src/lib/validation/experiment/types.ts`) gains
  two additive optional fields — `author` and `modelVersions` — so
  `experiment-tracker/` can attribute an experiment to a person and a
  model-registry snapshot without changing Phase 12's stored shape or its
  own CLI (`validation:calibrate`) at all.

### Compatibility
- **Zero changes** to `rep-counter.ts`, `state-machine.ts`,
  `form-rules.ts`, `calibration.ts` — same boundary as every prior phase.
- **Zero changes** to any file under `form-engine/`, `movement-engine/`,
  `injury-risk-engine/`, `performance/`, `personalization/`, or
  `exercise-intelligence/`.
- **Phase 12's validation framework is otherwise untouched** — the only
  change is the additive `Experiment` type extension above; every
  existing Phase 12 function signature, file, and CLI script behaves
  identically.
- Runs entirely offline (CLI scripts + one on-demand dashboard API route,
  plus the one small `POST /api/feedback` route) — nothing in this phase
  executes during a live session, on the pose loop, or the render loop.
- No new Prisma models or migrations — releases, datasets, experiments,
  golden checksums, review items, and feedback are all file-based
  (`.data/mlops/`), independent of the app's database.

## Unreleased — Phase 12: AI Validation & Benchmark Framework

### Added
- `src/lib/validation/` — 15 offline-only modules (dataset, ground-truth,
  statistics, metrics, confusion-matrix, benchmark, evaluation,
  comparison, threshold-testing, calibration, experiment, leaderboard,
  video-review, reports, validator) that scientifically evaluate the Rep
  Engine's counting accuracy, Form Engine issue detection, and pose
  pipeline latency — against recorded sessions, never a live one. Zero
  changes to any AI engine's runtime behavior.
- **Dataset Manager**: a `LabeledSession` is exactly the JSON a developer
  already downloads from the Dev HUD's export button
  (`session-report.tsx`'s `exportDebug()`) — no new export format.
  Versioned, file-based datasets under `.data/validation/datasets/`.
- **Ground Truth**: JSON and CSV importers for manually-labeled true rep
  counts (optionally per-rep timestamps), expected ROM/tempo/form issues
  — the real, independently-verified label `dev-history.ts`'s
  `DevSession.actualReps` never was (that field is auto-populated from
  the engine's own count).
- **Benchmark Engine**: precision/recall/F1/confusion counts for rep
  counting (timestamp-matched when per-rep ground truth exists, count-only
  approximation otherwise), a set-based accuracy check for Form Engine
  `topIssues` vs. expected issues, and inference-latency percentiles
  (p50/p95/p99) — one report per exercise.
- **Threshold Testing**: replays every recorded rep/rep-rejected decision
  through the real, imported `buildValidation()` ROM check (from
  `state-machine.ts`) against a candidate required-progress fraction —
  the automated version of the "compare per-rep peak vs. required" manual
  tuning workflow. Never touches `rep-counter.ts` or `exercises.ts`.
- **Calibration**: versioned candidate threshold sets + an "active
  candidate" pointer per pose key (rollback = pointing at an earlier
  version) — bookkeeping for this framework only, never the real
  production config.
- **Experiment Manager**: persists named before/after comparisons
  (dataset, metrics, winner, regression flag) to `.data/validation/
  experiments/`; a leaderboard ranks them by F1 per pose key.
- **Reporting**: JSON/Markdown/CSV/HTML report renderers; the HTML report
  is print-to-PDF-friendly and embeds the same structured data a chart
  would need in a `<script type="application/json">` block (no charting
  library added).
- **CLI**: `npm run validation:benchmark|validate|compare|evaluate|
  calibrate|report`, thin wrappers over `scripts/validation/*.ts` — see
  `DEVELOPER_GUIDE.md` "Running the AI Validation & Benchmark Framework".
- Developer dashboard: new `/settings/developer/validation` page —
  dataset coverage, benchmark history, regression alerts, and per-exercise
  accuracy/precision/recall/F1/latency, backed by
  `GET /api/validation/status`.
- `.data/` added to `.gitignore` (covers both this phase's datasets/
  experiments/reports and Phase 11's local storage provider).

### Compatibility
- **Zero changes** to `rep-counter.ts`, `state-machine.ts`,
  `form-rules.ts`, `calibration.ts` — same boundary as every prior phase.
  `threshold-testing/` *imports* `buildValidation` from `state-machine.ts`
  (read-only reuse, exactly as documented there as a pure, DOM-free,
  externally-callable function) but modifies none of it.
- **Zero changes** to any file under `form-engine/`, `movement-engine/`,
  `injury-risk-engine/`, `performance/`, `personalization/`, or
  `exercise-intelligence/`.
- Runs entirely offline (CLI scripts + one on-demand dashboard API route)
  — nothing in this phase executes during a live session, on the pose
  loop, or the render loop.
- No new Prisma models or migrations — this framework's datasets, ground
  truth, calibration versions, and experiments are file-based
  (`.data/validation/`), independent of the app's database.

## Unreleased — Phase 11: Production Platform

### Added
- `src/lib/platform/` — 18 infrastructure modules (feature-flags,
  rate-limiter, cache, queue, jobs, telemetry, metrics, monitoring, audit,
  events, notifications, billing, subscriptions, usage, api-versioning,
  storage, cdn, security) that sit beside every AI engine, never inside
  one. No AI engine algorithm changed; see "Compatibility" below.
- **Feature Flags**: percentage rollout, user-specific overrides, remote
  config via `FEATURE_FLAGS_JSON`, and a mirrored set of engine on/off
  keys alongside (not replacing) `src/lib/dev.ts`'s client-side flags.
- **Rate Limiting**: in-memory sliding-window limiter with presets for
  auth/coach/session/upload/mobile-API buckets — actually wired into
  `POST /api/auth/login` (by IP) and `POST /api/sessions` /
  `POST /api/workout-logs` (by user id), not just defined.
- **Caching**: a `CacheProvider` interface with a memory implementation
  today and a dependency-injectable `RedisCacheProvider` shape for later;
  four preset namespaces (session/exercise/AI-coach/personalization).
- **Background Jobs**: weekly/monthly review, achievement generation,
  progress-prediction refresh, email generation, notification scheduling,
  and cleanup — built on the existing `@/lib/performance`/
  `@/lib/personalization` read APIs, registered with the scheduler but not
  auto-started (see "Known limitations").
- **Telemetry & Metrics**: in-memory event/timing/error tracker and a
  counter/gauge/histogram registry; wired into `workout.completed` on both
  session-save routes.
- **Monitoring**: `GET /api/health`, `/api/health/ready`,
  `/api/health/live`; a structured JSON logger with level filtering and a
  `logSlowQuery()` helper.
- **Audit Logging**: security/compliance event log (auth success/failure
  wired into the login route today), in-memory + structured-logger sink.
- **Events**: a typed in-process pub/sub bus; the notifications module
  subscribes to it so any future publisher only needs one `publish()` call.
- **Notifications**: persists to the existing (previously unused) Prisma
  `Notification`/`NotificationType` model for kinds it already models
  (workout reminder, achievement), plus an email channel, for the two
  kinds it doesn't yet model (weekly summary, goal reached, coach message)
  — architecture only, no scheduled sends wired up.
- **Billing/Subscriptions/Usage**: a provider-agnostic `BillingProvider`
  interface with an in-memory dev implementation (no Stripe/Razorpay SDK
  installed yet); a 3-tier plan table (free/pro/elite) with per-metric
  limits; monthly usage counters + quota checks cross-referencing the two.
- **API Versioning**: version negotiation (`X-API-Version` header,
  default v1) and a deprecation-header helper — no v2 exists yet, this is
  the seam for when one does.
- **Storage**: a `StorageProvider` interface with a local-disk
  implementation and a real signed-URL flow — `GET /api/storage/[...key]`
  verifies an HMAC token (`security/signed-urls.ts`) before streaming a
  file back.
- **CDN**: a passthrough provider that resolves asset paths through
  `NEXT_PUBLIC_CDN_URL` if set, otherwise returns the path unchanged.
- **Security**: secrets abstraction (`requireEnv`/`getEnv`), API key
  generate/hash/verify (SHA-256, timing-safe compare), HMAC signed
  payloads/URLs, and a thin zod request-validation wrapper.
- Developer dashboard: new `/settings/developer/platform` page — Platform
  Health, Cache Status, Queue Status, Job Metrics, Feature Flags, Rate
  Limits, Subscription Status, and API Metrics, backed by
  `GET /api/platform/status`.

### Compatibility
- **Zero changes** to `rep-counter.ts`, `state-machine.ts`,
  `form-rules.ts`, `calibration.ts` — same boundary as every prior phase.
- **Zero changes** to any file under `form-engine/`, `movement-engine/`,
  `injury-risk-engine/`, `performance/`, `personalization/`, or
  `exercise-intelligence/` — no AI engine algorithm or scoring logic
  changed. The only touches to already-shipped files are additive
  telemetry/rate-limit calls at the API-route boundary (`sessions/`,
  `workout-logs/`, `auth/login` route handlers) and a new link on the
  Developer settings page — none of them change what those routes compute
  or return on success.
- No new Prisma models or migrations — `notifications/` reuses the
  existing, previously-unused `Notification` model/`NotificationType`
  enum as-is.
- Everything is asynchronous and off the pose/render loop — no per-frame
  cost, no FPS impact (see ALGORITHM.md "Production Platform").

## Unreleased — Phase 10: Exercise Intelligence Engine

### Added
- `src/lib/exercise-intelligence/` — a read-only exercise-metadata catalog
  (biomechanics, ROM/tempo envelopes, joint involvement, symmetry
  expectations, risk sensitivities, common mistakes) for 21 exercises
  (Squat, Bench Press, Deadlift, Overhead Press, Barbell Row, Pull Up, Lat
  Pulldown, Seated Row, Leg Press, Leg Extension, Leg Curl, Romanian
  Deadlift, Hip Thrust, Lunge, Split Squat, Push Up, Dumbbell Curl, Hammer
  Curl, Lateral Raise, Face Pull, Triceps Pushdown). Pure metadata: no
  landmark analysis, no DB access, no per-frame computation — loads once.
  See `ALGORITHM.md` "Exercise Intelligence".
- A classifier (`classifyExercise`/`resolveExerciseProfile`) that resolves
  either a Prisma `Exercise.slug` or a pose-layer `poseKey` to a catalog
  entry via an alias map built once at module load — an O(1) lookup, not a
  per-frame scan.
- A capabilities API (`supportsExercise`, `getExerciseProfile`,
  `getMovementProfile`, `getROMProfile`, `getTempoProfile`,
  `getCommonMistakes`, `getRiskProfile`) — the intended integration surface
  for the Rep, Form, Movement, Injury Risk, Performance, and
  Personalization engines. Nothing in this phase actually wires it into
  those engines' scoring logic (see "Compatibility" below); the API exists
  so future phases can adopt it without any of this phase's files
  changing.
- Dev HUD "EXERCISE INTELLIGENCE" section in `live-session.tsx` (movement
  pattern, ROM range, tempo envelope, overall risk sensitivity, difficulty,
  top common mistakes) plus a matching on/off toggle in
  `/settings/developer` (`forge:exerciseintelligence`, on by default, same
  pattern as the Form/Movement/Injury-Risk Engine toggles).

### Compatibility
- **Zero changes** to `rep-counter.ts`, `state-machine.ts`,
  `form-rules.ts`, `calibration.ts` — same boundary as every prior phase.
- **Zero changes** to any file under `form-engine/`, `movement-engine/`,
  `injury-risk-engine/`, `performance/`, or `personalization/` — this phase
  only *exposes* a capabilities API; it does not modify any existing
  engine's inputs, outputs, or scoring.
- No new Prisma models, fields, or migrations — this module reads no
  database rows; it only maps existing `Exercise.slug`/`poseKey` strings
  (already present on every `Exercise` row) to its own in-memory catalog.
- No per-frame pose computation and no per-frame database calls — the
  catalog and alias map are built once at module load; every capability
  function is a synchronous map lookup.

## Unreleased — Phase 8: Personalized Learning Engine

### Added
- `src/lib/personalization/` — an adaptive learning layer above Phase 7
  that personalizes coaching data for each user over time. Same timing as
  Phase 7 (post-workout only, its own independent try/catch); never
  mutates any existing engine's output. See `ALGORITHM.md` "Personalized
  Learning Engine".
- 6 new Prisma models, all additive (new tables + new optional relation
  fields on `User`/`Exercise`, zero changes to any existing field, type,
  index, or constraint): `UserLearningProfile`, `AdaptiveThreshold`,
  `LearnedWeakness`, `RecommendationEffectiveness`, `GoalProfile`,
  `ProgressPrediction`, plus 4 new enums (`FatigueProfile`,
  `CoachingStyle`, `TrainingGoal`, `WeaknessClassification`). Applied via
  `prisma db push`, verified with a read-only `prisma migrate diff` dry
  run beforehand (6 `CREATE TABLE`s, 4 new enums, zero `ALTER`/`DROP` on
  any existing table).
- User Profile learning: experience level, favorite/weakest/strongest
  exercises, preferred volume, consistency profile, fatigue profile,
  injury-risk tendency, confidence/movement-quality trend, all in one
  `UserLearningProfile` row with a `learningConfidence` data-availability
  proxy.
- Adaptive Thresholds: personalized 25th/75th-percentile overrides across
  9 threshold types (ROM/depth, tempo, symmetry, consistency, instability,
  velocity loss, fatigue, compensation) — never overwrites any code-owned
  default; stored as a separate, additive table.
- Weakness Learning: classifies each of Phase 7's tracked weaknesses as
  new/recurring/resolved/rapidly-improving/persistent, with a recurrence
  probability.
- Fatigue Learning: classifies a fatigue profile (easy recovery / slow
  recovery / fatigue resistant / rapid fatigue) from risk-score history
  and inter-session gaps.
- Recommendation Learning: tracks whether Injury Risk recommendations
  correlate with an improved risk score in the following session.
- Goal Engine: 6 training goals, each mapped to which Performance Score
  dimensions matter most (informational only).
- Coach Personality: 5 coaching-style preferences, stored only — no
  coaching-text logic changed, no UI yet.
- Progress Prediction: heuristic linear-regression-style extrapolation
  (expected improvement %, plateau probability, estimated next PR
  value/date, expected recovery time) — no LLM, per spec.
- New read-only API routes under `api/personalization/*`:
  `getUserProfile`, `getAdaptiveThresholds`, `getLearningSummary`,
  `getPrediction`, `getGoalProfile`, `getRecommendationHistory`. Two
  additional writable routes (`POST .../goal`, `POST .../coach-style`) —
  a programmatic surface for a future UI, since none exists yet.
- Dev HUD "PERSONALIZATION ENGINE" section in `session-report.tsx`
  (learning confidence, goal, coach style, prediction, adaptive
  thresholds, recovered/persistent weakness counts) — placed here rather
  than the live in-session HUD, same reasoning as Phase 7. Folded into
  `exportDebug()`/`exportCsv()`.

### Changed
- `src/lib/performance/index.ts` gains one additive export
  (`classifyProgress`, already implemented in `progress.ts`) so Phase 8
  can reuse it instead of reimplementing the same trend classification a
  third time — no existing export changed.

### Compatibility
- **Zero changes** to `rep-counter.ts`, `state-machine.ts`,
  `form-rules.ts`, `calibration.ts` — same boundary as every prior phase.
- **Zero changes** to any file under `form-engine/`, `movement-engine/`,
  or `injury-risk-engine/`.
- **Persistence Layer (Phase 7) untouched except the one additive barrel
  export above** — no existing Phase 7 field, function, or table changed.
- All Prisma schema changes are additive — verified via a read-only dry
  run before applying. Every existing query, route, and component keeps
  working unchanged.

## Unreleased — Phase 7: Performance Intelligence & Persistence Layer

### Added
- `src/lib/performance/` — the first layer to persist workout data.
  Everything runs after a session ends, inside an API route; nothing here
  touches pose data or runs during a live session. See `ALGORITHM.md`
  "Performance Intelligence & Persistence Layer".
- 8 new Prisma models, all additive (new tables + new optional relation
  fields on `User`/`Exercise`/`WorkoutLog`/`WorkoutSession` — zero changes
  to any existing field, type, index, or constraint): `SessionFormAnalysis`,
  `SessionMovementAnalysis`, `SessionRiskAnalysis` (1:1 per `WorkoutSession`,
  persisting the Form/Movement/Injury-Risk Engines' full session rollups —
  previously computed client-side only and never sent to the server),
  `PerformanceSnapshot`, `WeaknessHistory`, `PersonalBest` (9 categories),
  `TrendHistory`, `UserStatistics`. Applied to the live database via
  `prisma db push` (verified via a read-only `prisma migrate diff` dry run
  beforehand — 8 `CREATE TABLE`s, 1 new enum, zero `ALTER`/`DROP` on any
  existing table).
- Performance Score: 8 dimensions (workout/exercise/consistency/technique/
  strength/recovery/volume/overall, 0-100), computed per exercise-session
  and per whole workout.
- Progress Engine: 6-way classification (rapid improvement / improving /
  stable / plateau / declining / regression) per exercise and overall.
- Weakness Tracking: server-side, cross-device recurring-issue history
  (frequency/severity/trend/last-seen), reconciled from the Form Engine's
  issue log and Movement Engine's compensation events.
- Personal Best Engine: 9 categories (highest weight, most reps, most
  volume, longest workout, best technique/consistency/symmetry/movement/
  performance session) — new `PersonalBest` model, distinct from the
  existing weight+reps-only `PersonalRecord`.
- Trend Analysis: 7-session/30-day/90-day trend + rolling average +
  improvement/regression %, cached in `TrendHistory`.
- Achievements: 7 new catalog entries (New PR, Technique Milestone, 100
  Perfect Reps, 10 Perfect Sessions, Consistency/Weekly/Monthly Streak) —
  reuses the existing `Achievement`/`UserAchievement` tables, no new models.
- New read-only API routes under `api/performance/*`: `getWorkoutHistory`,
  `getExerciseHistory`, `getPerformanceTrend`, `getWeaknessTrend`,
  `getRiskTrend`, `getPersonalBests`, `getAchievements`.
- `api/sessions`/`api/workout-logs` now accept optional `formAnalysis`/
  `movementAnalysis`/`injuryRiskAnalysis` in the POST body and call the
  Performance Engine after the core write succeeds (wrapped in try/catch —
  a Performance Engine failure never fails the already-saved workout).
  Response gains an additive `performance` field.
- `session-report.tsx` now sends the three engine summaries it already had
  client-side, shows a "Performance" summary card (score, new PRs,
  achievements — ordinary positive fitness-app UX, unlike the Injury Risk
  Engine's deliberately withheld live surface), a dev-only "PERFORMANCE
  ENGINE" section (workout score, progress, trend, PRs, weakness trend,
  history count — placed here rather than the live Dev HUD, since this
  data doesn't exist until the workout POSTs and returns), and extends
  `exportDebug()`/`exportCsv()`.
- `workout-session/experience.tsx` sends the most-recent AI-tracker
  sub-session's `formAnalysis`/`movementAnalysis` per exercise (matched by
  slug) in its `/api/workout-logs` POST body.

### Compatibility
- **Zero changes** to `rep-counter.ts`, `state-machine.ts`,
  `form-rules.ts`, `calibration.ts` — same boundary as Phases 4-6.
- **Zero changes** to any file under `form-engine/`, `movement-engine/`,
  or `injury-risk-engine/` — this phase only reads their already-exported
  summary types (type-only imports for accurate persistence typing, not a
  logic dependency).
- All Prisma schema changes are additive — verified via a read-only dry
  run before applying. Every existing query, route, and component keeps
  working unchanged; new relations are optional and only populated when
  explicitly `include`d.
- `PersonalRecord`, `Achievement`/`UserAchievement`, and all pre-Phase-7
  tables/columns are untouched.

## Unreleased — Phase 6: Injury Risk Engine

### Added
- Injury Risk Engine (`src/lib/pose/injury-risk-engine/`) — the top layer
  of the architecture (`Pose Detection -> Rep Engine -> Form Engine ->
  Movement Engine -> Injury Risk Engine`), estimating short-term movement
  risk purely from the Form and Movement Engines' already-computed output.
  See `ALGORITHM.md` "Injury Risk Engine".
- 10 risk categories (muscular fatigue, technique degradation, joint
  instability, compensation accumulation, movement inconsistency,
  asymmetry, high velocity loss, recovery deficit, repeated form
  breakdown, increasing issue frequency), each scored 0-100 and combined
  into one `riskScore` (0-100) and `LOW`/`MODERATE`/`HIGH` level.
- Heuristic fatigue/load/confidence scoring from rep-interval trend,
  rep-score trend, rest gaps, session duration, and history depth — no
  physiological modeling.
- Cooldown-gated (30s) recommendations mapped from the top contributing
  factor (reduce load, increase rest, stop exercise, focus on technique,
  slow eccentric, reduce ROM, stretch, hydrate, end workout).
- Dev HUD "INJURY RISK ENGINE" section; debug JSON/CSV export extended
  with the risk timeline, highest/average risk, risk trend, most common
  causes, and recommendation history
  (`SessionResult.injuryRiskAnalysis`).
- "Injury Risk Engine" developer toggle (on by default).
  (`src/lib/dev.ts`, Developer Settings page)
- Safety wording throughout: "elevated movement risk," "fatigue
  accumulation," "technique deterioration," "movement instability" — never
  "injury" or diagnostic phrasing. This is coaching guidance, not a
  medical assessment.

### Compatibility
- **Zero changes** to `rep-counter.ts`, `state-machine.ts`,
  `form-rules.ts`, `calibration.ts` — same boundary as Phases 4-5.
- **Zero changes** to any file under `src/lib/pose/form-engine/` or
  `src/lib/pose/movement-engine/` — this phase's inputs were fully covered
  by those engines' existing public output, so no additive exposure was
  needed this time (unlike Phase 5, which needed two small Form Engine
  extensions). Confirmed via `git status`.
- No live end-user-facing coaching cue or session-report UI card added
  this phase — scoped to dev HUD + session-summary data + export, per this
  phase's own spec (Developer HUD + Session Summary, not a consumer
  surface). See `ALGORITHM.md` "Scope this phase".
- Runs only in the single-exercise trainer flow (`live-session.tsx`) this
  phase, not the freeform workout-session builder.

## Unreleased — Phase 5: Movement Intelligence Engine

### Added
- Movement Intelligence Engine (`src/lib/pose/movement-engine/`) — a layer
  above the Form Engine that analyzes movement *over time* within a set:
  smoothness, left/right symmetry, compensation patterns, rep-to-rep
  consistency, and trend direction. Foundation for a future Injury Risk
  Engine. See `ALGORITHM.md` "Movement Intelligence Engine".
- Kinematics (velocity/acceleration/jerk) derived from the Rep Engine's own
  `progress` signal — a smoothness proxy, no new pose math.
- Left/right symmetry from two new dual-sided Form Engine joint-metric
  fields (`kneeAngleDeg`, `elbowAngleDeg`) plus a dominant-side estimate.
- Compensation detection — a 7-rule co-occurrence table over the Form
  Engine's already-detected issues (e.g. elbow flare + shoulder elevation →
  shoulder compensation), describing observed behavior, not a diagnosis.
- Consistency analysis (rep-to-rep drift, early-vs-late-set drift, tempo/
  ROM/technique/stability drift) computed from the Form Engine's own sealed
  per-rep records.
- Eight 0–100 movement scores (Smoothness, Control, Coordination, Symmetry,
  Consistency, Stability, Efficiency, Overall) with in-session history and
  trend classification (improving/degrading/stable) per dimension.
- Higher-level, longer-cooldown coaching (25s vs. the Form Engine's 3.5s),
  shown in the same cue bubble only when neither a rep cue nor a Form
  Engine cue already occupies it.
- Session summary: strengths, weaknesses, consistency/symmetry/
  compensation/trend summaries, and focus areas
  (`SessionResult.movementAnalysis`, `AiLogChunk.movementAnalysis`).
- Dev HUD "MOVEMENT ENGINE" section; debug JSON/CSV export extended with
  movement scores, score history, and the consistency/symmetry/
  compensation/trend summaries.
- "Movement Intelligence Engine" developer toggle (on by default).
  (`src/lib/dev.ts`, Developer Settings page)

### Changed
- `form-engine/joint-metrics.ts` gains three dual-sided fields
  (`kneeAngleDeg`, `elbowAngleDeg`, `hipHeightNorm`) the Form Engine itself
  doesn't use — added purely so the Movement Engine can reuse already-
  computed joint geometry instead of re-deriving it from keypoints.
- `form-engine/types.ts`'s `FormAnalysisSnapshot` gains two fields
  (`metrics`, `sway`) exposing data the Form Engine already computes
  internally — additive, no existing field's shape or meaning changed.
- `form-engine/temporal-tracker.ts`'s `RollingStat` gains a `mean` getter
  (additive) alongside its existing `stdDev` getter.

### Compatibility
- Zero changes to `rep-counter.ts`, `state-machine.ts`, `form-rules.ts`, or
  `calibration.ts` — same boundary as Phase 4.
- The three Form Engine files touched this phase (`joint-metrics.ts`,
  `types.ts`, `temporal-tracker.ts`) received additive-only changes: new
  fields/getters, no existing field's shape or meaning changed. Phase 4's
  Form Engine behavior (issue detection, scores, coaching, HUD, exports) is
  unaffected — verified by construction, since every existing consumer of
  these types only reads fields that already existed.
- Movement Engine scoring constants (jerk scale, symmetry-diff bands,
  compensation cooldowns) are first-pass, conservative defaults — not yet
  tuned against real gym sessions, same tuning stance as Phase 4.

## Unreleased — Phase 4: Intelligent Form Analysis Engine

### Added
- Form Analysis Engine (`src/lib/pose/form-engine/`) — a standalone module
  that continuously scores movement quality and detects technique errors
  across the whole rep, independent of the Rep Engine. See
  `ALGORITHM.md` "Form Analysis Engine".
- Joint-level metrics (shoulder/hip tilt, torso lean, back angle, body line,
  knee-valgus ratio, elbow flare, heel/toe lift, ear-shoulder gap), normalized
  against the Calibration Engine's scale where relevant.
- 22 detectable technique issues (rounded/overextended back, forward lean,
  hip/weight shift, uneven hips/shoulders, knee valgus/varus, heel/toe lift,
  elbow flare/too-narrow, shoulder elevation, incomplete lockout, partial
  range, torso rotation, head/neck position, loss of balance, core
  instability, bar-path deviation), each with confidence, severity,
  affected joints, and a correction message.
- Exercise-specific expected-movement profiles for squat, bench press,
  deadlift, push-up, pull-up, shoulder press, barbell row, lateral raise,
  and bicep curl (`src/lib/pose/form-engine/exercises/`) — net-new coverage
  for bench press, pull-up/pulldown, row, lateral raise, and curl, which had
  no form checks at all before this phase.
- Temporal smoothing (5-frame activation, 10-frame clear) so issues report
  as stable started/ongoing/resolved states instead of flickering.
- Eight 0–100 scores (Joint, Alignment, Balance, ROM, Stability, Movement
  Quality, Technique, Overall) with in-session history.
- Cooldown-gated live coaching, shown in the same cue bubble used for rep
  praise/correction (Form Engine only speaks when no rep cue is showing).
- Device-local cross-session weakness tracking (`forge:form-weaknesses`).
- Dev HUD "FORM ENGINE" section; debug JSON/CSV export extended with
  per-rep form scores, the issue log, score history, and coaching events
  (`SessionResult.formAnalysis`, `AiLogChunk.formAnalysis`).
- "Form Analysis Engine" developer toggle (on by default).
  (`src/lib/dev.ts`, Developer Settings page)

### Compatibility
- Zero changes to `rep-counter.ts`, `state-machine.ts`, `form-rules.ts`, or
  `calibration.ts` — the Adaptive Threshold Mode branching, named state
  machine, and Calibration Engine behave exactly as before this phase. The
  Form Engine only reads `CoachState` (already-exported telemetry) and the
  Calibration Engine's saved profile; every integration point elsewhere
  (`use-pose-trainer.ts`, `live-session.tsx`, `session-report.tsx`,
  `workout-session/*`) is an additive field or additive UI block, not a
  rewrite of existing logic.
- Exercise-specific fault thresholds are first-pass, conservative defaults —
  not yet tuned against real gym sessions. Following the Phase 1–3 process,
  they'll only change from real gym-tested JSON debug exports.

## Unreleased — Phase 2: Intelligent Exercise State Machine & Rep Validation

### Added
- Named rep state machine (`WAITING → READY → DESCENDING → BOTTOM →
  ASCENDING → LOCKOUT → REP_COMPLETE`) as a transparent layer over the
  existing bottom-turnaround detector — see `ALGORITHM.md`.
  (`src/lib/pose/state-machine.ts`, integrated in `rep-counter.ts`)
- Structured rep validation checklist (ROM, confidence, tempo, stability,
  form) surfaced on every accepted/rejected rep, with named rejection codes.
- "Strict rep validation" developer toggle (off by default): when enabled,
  tempo and stability checks reject a rep instead of only being advisory.
  (`src/lib/dev.ts`, Developer Settings page)
- Dev HUD: current/previous state, transition reason, state confidence, pose
  confidence, and the live validation checklist.
- Debug JSON export: `rep`/`rep-rejected` log entries now carry `state`,
  `prevState`, `reasonCode`, and the full `validation` result.

### Changed
- `REP_TUNING` gains `MIN_REP_INTERVAL_MS` (hoisted from an inline `450`,
  same value — pure transparency, no behavior change) and `MIN_STABILITY`
  (new, only active in strict mode).

### Compatibility
- With Strict rep validation off (default), accept/reject behavior for every
  exercise is unchanged from Phase 1 — verified by construction: the new
  states are derived from the same signals the existing detector already
  computed, and `REP_COMPLETE`/rejections fire at the exact frames the prior
  logic already accepted/rejected reps.

## Phase 1: Calibration Engine & Camera Intelligence

### Added
- Per-user calibration profile (`src/lib/pose/calibration.ts`): px→cm scale
  from onboarding height, shoulder/hip width, arm/leg/torso length, relative
  camera framing (close/ideal/far), camera roll, orientation, and left/right
  symmetry confidence. Computed once the pre-workout camera check is stable,
  persisted to `localStorage`, and shown in the camera guide UI.
- Camera quality checks: blur/sharpness score, FPS estimate, and a rear-view
  heuristic (front-like shoulder ratio with low face-landmark confidence),
  all gating the pre-workout "ready" state with a visible reason.
- Calibration profile stamped into the existing debug JSON exports
  alongside `REP_TUNING`/smoothing params.

### Compatibility
- No changes to `REP_TUNING`, `RepConfig` angles, or `form-rules.ts` bands —
  calibration data is computed and surfaced only; it is not yet wired into
  detection thresholds.
