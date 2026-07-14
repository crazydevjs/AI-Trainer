# Roadmap

Carries forward `README.md`'s numbered roadmap with more implementation
detail per phase. `README.md` is the product-facing summary; this is the
engineering-facing detail, kept current alongside `CHANGELOG.md`.

## Shipped

1. **Foundation · Auth · Onboarding**
2. **Exercise Database & Workout Creator** — 120 exercises, equipment
   catalog, filters/AI badges, custom workouts + program templates.
3. **AI Camera Trainer** — MoveNet/BlazePose hybrid pose detection, the
   bottom-turnaround rep-counting engine, calibration, and the named state
   machine. See `ALGORITHM.md`.
4. **Workout Session System** — multi-exercise session planning, live
   tracking, PR detection, shareable summary cards, training log.
5. **Intelligent Form Analysis Engine** — continuous, whole-rep technique
   scoring and coaching, independent of the Rep Engine. See `ALGORITHM.md` →
   "Form Analysis Engine" and `SYSTEM_ARCHITECTURE.md` for the module map.
6. **Movement Intelligence Engine** — whole-set movement analysis above the
   Form Engine: kinematics, symmetry, compensation detection, consistency,
   and trend classification. See `ALGORITHM.md` → "Movement Intelligence
   Engine".
7. **Injury Risk Engine** — the top layer of the runtime pipeline,
   estimating short-term movement risk (`LOW`/`MODERATE`/`HIGH`) purely
   from the Form and Movement Engines' output: fatigue, load, and
   confidence heuristics, 10 risk categories, cooldown-gated
   recommendations. Dev HUD + session export only — no consumer-facing
   surface yet (see Phase 10 candidates). See `ALGORITHM.md` → "Injury
   Risk Engine".
8. **Performance Intelligence & Persistence Layer** — the first layer to
   persist workout data: server-side Performance Scores (8 dimensions),
   Progress Engine (6-way trend classification), Weakness Tracking
   (cross-device, server-side), Personal Best Engine (9 categories), Trend
   Analysis (7-session/30-day/90-day), and achievements. Runs entirely
   after a workout ends — no runtime engine behavior changed. See
   `ALGORITHM.md` → "Performance Intelligence & Persistence Layer".
9. **Personalized Learning Engine** — an adaptive layer above Phase 7 that
   learns what's normal for each user: a long-term profile, personalized
   adaptive thresholds (never overwriting any default), weakness
   classification, fatigue-curve learning, recommendation-effectiveness
   tracking, goal-adapted focus mapping, coaching-style preference, and
   heuristic progress prediction. Runs only after a workout; no UI
   consumes it yet. See `ALGORITHM.md` → "Personalized Learning Engine".
10. **Exercise Intelligence Engine** — a read-only exercise-specific
    biomechanics metadata layer (ROM, tempo, joint involvement, symmetry,
    risk sensitivity, common mistakes) for 21 exercises, sitting alongside
    every existing engine rather than inside the pipeline. Exposes a
    capabilities API for the Rep/Form/Movement/Injury-Risk/Performance/
    Personalization engines to adopt, but this phase only wires it into
    the Dev HUD — no existing engine's scoring changed. See `ALGORITHM.md`
    → "Exercise Intelligence".
11. **Production Platform** — 18 infrastructure modules (feature flags,
    rate limiting, caching, background jobs, telemetry, metrics,
    monitoring/health checks, audit log, events, notifications, billing,
    subscriptions, usage tracking, API versioning, storage, CDN, security)
    that sit beside every AI engine, not inside one — zero AI algorithm
    changes. Real providers (Redis/Stripe/Razorpay/S3-compatible) aren't
    wired up yet; every interface has a working in-memory/local default
    instead (see `ALGORITHM.md` "Production Platform" → "Known
    limitations"). New Developer dashboard page at
    `/settings/developer/platform`. See `ALGORITHM.md` → "Production
    Platform".
12. **AI Validation & Benchmark Framework** — offline-only measurement
    tooling that scores the Rep Engine's counting accuracy (precision/
    recall/F1), Form Engine issue detection, and pose-pipeline latency
    against human-labeled ground truth, per exercise. Threshold testing
    replays recorded decisions through the real `buildValidation()`
    function to A/B test candidate thresholds without touching
    `exercises.ts`. Six CLI scripts (`npm run validation:*`) plus a new
    `/settings/developer/validation` dashboard. Never runs during a live
    session; zero AI algorithm changes. See `ALGORITHM.md` → "AI
    Validation & Benchmark Framework".
13. **AI Training & Continuous Improvement Platform** — release
    governance on top of Phase 12: a model registry tracking a version
    per component, dataset coverage/quality scoring, immutable golden
    datasets with checksum verification, PSI-based drift detection,
    regression detection against up to three baselines, six-criteria
    release gates, a release lifecycle (candidate → approved/rejected →
    deployed) with deployment history, a human-review queue that writes
    corrections straight back to Phase 12 ground truth, a feedback
    pipeline, and active-learning prioritization for unlabeled sessions.
    Eight CLI scripts (`dataset:*`, `release:*`, `feedback:sync`,
    `drift:check`, `quality:report`) plus a new
    `/settings/developer/mlops` dashboard and one small end-user-facing
    route (`POST /api/feedback`, no UI yet). Offline only; zero AI
    algorithm changes. See `ALGORITHM.md` → "AI Training & Continuous
    Improvement Platform".
14. **AI Observability & Experimentation Platform** — explains how the AI
    behaves in *production*: distributed tracing (a trace + spans per
    engine on every session save), real production/user analytics from
    Prisma (completion rate, exercise popularity, coach usage,
    personalization adoption, DAU/WAU/MAU, cohort retention, usage
    heatmaps, onboarding funnel — all verified against real dev data),
    a cost dashboard (real storage-disk usage, honest $0 for the LLM/
    bandwidth that don't exist yet), a latency dashboard (real API/engine/
    storage timing, honest "not instrumented" for the rest), error
    grouping wired into the app's existing error boundaries, a composite
    health score, seven-condition alerting, and a live A/B
    experiment/rollout platform that genuinely drives Phase 11's feature
    flags (a real bug in winner selection caught and fixed during manual
    testing). Eight CLI scripts plus a `/settings/developer/observability`
    dashboard. Discovered and fixed that Phase 11's entire `platform/`
    tree still had a stale `"server-only"` marker breaking CLI usage
    (46 files, zero behavior change). Never participates in inference;
    zero AI algorithm changes. See `ALGORITHM.md` → "AI Observability &
    Experimentation Platform".

## Shipped — AI Trainer v1 Beta (Phases 15–27)

A production-hardening push, distinct from every AI-engine phase above:
no new AI engines, no changes to `src/lib/pose/` or the Form/Movement/
Injury-Risk/Performance/Personalization/Exercise-Intelligence engines.
Goal: safe to hand to 100 real users. See `CHANGELOG.md` for per-phase
detail as each lands.

15. **Authentication & Session Security Hardening** — fail-closed
    `JWT_SECRET`/`SIGNING_SECRET`, `tokenVersion`-based session revocation,
    enforced email verification on login, rate limiting extended to
    signup/forgot-password/resend-verification/google-link, OAuth `state`
    CSRF protection, no more silent Google-account auto-linking (password
    confirmation required instead), security response headers. Done.
16. **Admin/internal access control** — `requireAdmin()` now gates the
    platform/mlops/validation/observability status+rollout routes
    (previously any authenticated user could call them — the rollout
    route could mutate a live feature flag) and a new `settings/developer/
    layout.tsx` server-side-gates all six Developer dashboard pages in
    production (previously a client-side `localStorage` flag only). Done.
17. **ESLint zero-warnings + technical debt cleanup** — fixed the full
    pre-existing 51-problem baseline to zero repo-wide, mostly React
    Compiler-readiness fixes (ref-timing, effect/state patterns) in the
    live trainer components. Not independently verified with a real
    camera session in this session (no browser automation available) —
    recommend a real gym-session check before relying on this. Done.
18. **UX foundations** — shared `Skeleton`/`EmptyState` components
    (`src/components/ui/`), route-local `loading.tsx` for the six
    highest-traffic pages, empty-state sweep on `workouts`/
    `profile/history`. API route try/catch consistency assessed and
    intentionally deprioritized (existing fallback is acceptable, not a
    bug) given the phases still ahead. Done.
19. **Accessibility & responsiveness pass** — `role="alert"` on form
    validation errors, missing input labels/aria-labels fixed, avatar alt
    text, `aria-hidden` on pointer-only shortcut layers that duplicate an
    existing keyboard button. Responsiveness spot-checked, no fundamental
    gap found. Not independently verified with a real screen reader/
    browser in this session. Done.
20. **Account management settings page + account deletion** — real
    Profile/Security/Danger-Zone settings page (replacing the
    `<ComingSoon>` stub), change-password (bumps `tokenVersion`),
    "log out everywhere", and immediate hard-delete account deletion.
    Fully smoke-tested end-to-end including a direct DB check confirming
    cascade cleanup. Done.
21. **Subscriptions/billing scaffolding** — `Subscription` Prisma model
    (migrated off the in-memory store), `StripeBillingProvider` (test
    mode, behind the existing `BillingProvider` interface), checkout/
    portal/webhook routes, `/settings/billing` page. Verified end-to-end
    against the mock provider (no Stripe keys needed for that path); the
    real Stripe checkout→webhook flow needs real test-mode credentials to
    verify, not available this session — see `.env.example` for exactly
    what to add and `CHANGELOG.md` Phase 21 for the verification steps
    once you have them. Done (pending real-Stripe verification).
22. **Admin analytics dashboard** — real `/admin` page (health, DAU/WAU/
    MAU, completion rate, adoption metrics, top errors, paginated users
    table via the one new `GET /api/admin/users` endpoint). Verified
    against a real admin account. Done.
23. **Performance pass** — `next/image` for the two Google-avatar `<img>`
    usages (+ `images.remotePatterns`), N+1/caching/bundle audit (no
    changes needed — tfjs already lazy-loaded, no N+1 found, no clear
    caching win at current scale). No bundle-analyzer report produced
    (not installed, Turbopack's build output doesn't show per-route
    sizes) and no real Lighthouse/framerate check (no browser available).
    Done.
24. **Playwright E2E (core flows) + first-ever CI** — 5 specs across
    auth/onboarding/workout-session/account-deletion, all passing
    reliably against the real dev DB. Found and fixed 2 test-selector
    bugs, 1 test-ordering bug, and — while chasing what first looked
    like E2E flakiness — a real production fix: `src/lib/prisma.ts` now
    appends `pgbouncer=true` for Neon's pooled endpoint (see
    `CHANGELOG.md` for why this matters beyond tests). `.github/
    workflows/ci.yml` written but not yet run for real — needs
    `DATABASE_URL_TEST`/`JWT_SECRET_TEST`/`SIGNING_SECRET_TEST` added as
    repo secrets (a dedicated test DB, `db push` overwrites its schema
    every run). Done (pending real CI secrets).
25. **Crash-reporting completion** — global `window.onerror`/
    `unhandledrejection` handler (`CrashReporter`, mounted in the root
    layout) closes the gap where only React-render errors were captured.
    Verified end-to-end (synthetic report → shows up in the admin
    dashboard's top errors). No Sentry-equivalent needed at beta scale —
    existing error-groups pipeline is sufficient once durable (Phase 26).
    Done.
26. **Render deployment prep** — `output: "standalone"` + automatic
    asset-copy `postbuild` step, `engines.node` pin, complete env var
    checklist, `.data/` persistent-disk durability table, full setup
    guide in `docs/DEPLOYMENT.md`. Verified by actually running the
    standalone server locally (health check, a real page, static assets
    all confirmed working) — not deployed to a real Render service (no
    account access this session); the Render-side steps are documented
    for the user to execute directly. Done (pending real deploy).
27. **Release checklist + cutover** — `docs/RELEASE_CHECKLIST.md`
    (code quality, database, env vars, Render service, post-deploy smoke
    test, monitoring/rollback, and a section naming the deliberately-
    accepted gaps for v1 Beta). Final documentation sweep across
    `README.md`/`DEVELOPER_GUIDE.md`/`SYSTEM_ARCHITECTURE.md` completed
    alongside each phase above rather than saved for the end. Done.

All 13 phases (15–27) are done as of this entry. Two things still need
the user's own action before a real launch, both called out in their
phase's `CHANGELOG.md` entry and in `docs/RELEASE_CHECKLIST.md`: adding
real CI secrets (Phase 24) and actually deploying to a Render account
(Phase 26) — neither was available in this session.

## Future AI-engine feature candidates (post-v1-Beta)

Not committed yet — captured here so the next planning pass on the AI
product surface (after the beta hardening push above ships) starts from a
list instead of a blank page. Numbered separately from the Phases above to
avoid colliding with the v1 Beta phase numbers (15–27).

- **Build the UI that consumes Phases 8-9's output.** Adaptive thresholds,
  learned profile, predictions, goal, and coaching-style preference are
  all computed and persisted but nothing reads them yet outside the dev
  HUD/export — this is the single biggest unlock available today with no
  new backend work required (`getUserProfile()`, `getAdaptiveThresholds()`,
  `getLearningSummary()`, `getPrediction()`, `getGoalProfile()`,
  `getRecommendationHistory()` are all ready to call).
- **Decide how (or whether) to surface risk to end users.** The Injury
  Risk Engine's output exists (persisted server-side via
  `SessionRiskAnalysis`/`getRiskTrend()`) but stays dev-HUD/export-only by
  deliberate scope decision (see `ALGORITHM.md` "Scope this phase" in the
  Injury Risk Engine section) — still an open product decision, not an
  engineering default.
- **Have an existing engine's coaching logic actually read Phase 8's
  preferences.** `CoachingStyle`/`GoalProfile`'s focus-dimension mapping
  are stored but no Form/Movement/Injury-Risk coaching-text logic reads
  them yet, by explicit Phase 8 scope ("must never modify existing engine
  outputs directly").
- **Per-rep persistence.** Phases 7-8 persist session-level analysis; per-
  frame/per-rep detail stays as `Json` blobs rather than queryable rows —
  sufficient for the current read API, but a per-rep table (e.g.
  `RepAttempt`) would be needed for rep-level historical queries ("show me
  every rep where knee valgus fired across all sessions"), and would also
  let Phase 8's adaptive-threshold percentiles use real per-rep
  distributions instead of per-session score proxies.
- **Move the Performance/Personalization engine calls off the request
  path onto Phase 11's queue.** They still run synchronously inside the
  `/api/sessions`/`/api/workout-logs` request — several sequential Prisma
  calls per session. `src/lib/platform/queue/` now exists and is ready to
  take this work; it just isn't wired to these two routes yet.
- **Start Phase 11's job scheduler somewhere.** `weeklyReview`,
  `achievementGeneration`, etc. are implemented and registered
  (`jobScheduler.list()`) but `jobScheduler.start()` is never called —
  needs a decision on trigger (long-lived instance vs. Vercel Cron vs. a
  worker) before these run on any real cadence.
- **Wire a real billing/storage/cache provider.** Phase 11's
  `BillingProvider`/`StorageProvider`/Redis-shaped cache interfaces are
  ready for Stripe or Razorpay, S3/R2/GCS, and Redis respectively — none
  are installed yet, so this is a dependency + credentials + one
  constructor call per provider, not new architecture.
- **Extend the Injury Risk Engine, Performance card, and Personalization
  Engine to the freeform workout-session flow.**
  `workout-session/ai-set-tracker.tsx` still has no rest-timer/weight
  concept to feed the Injury Risk Engine, and `workout-session/summary.tsx`
  doesn't yet show the Performance/Personalization summaries
  `session-report.tsx` does.
- **Merge multiple AI-tracker sub-sessions per exercise** in the freeform
  flow, instead of sending only the most recent one.
- **Recommendation-effectiveness ground truth.** Phase 8's effectiveness
  tracking is a correlation proxy (no explicit user feedback loop) — a
  simple "did this help?" UI prompt after a recommendation would turn this
  into a real signal.
- **Threshold/weight tuning pass, now with Phase 12's tooling.** All
  engines' exercise-specific/scoring constants (pose engines, Performance
  Score weights, Phase 8's percentile-based adaptive thresholds) are
  first-pass/conservative (see each engine's "Known limitations" in
  `ALGORITHM.md`). `npm run validation:calibrate` can now A/B-test a
  candidate required-progress threshold against real labeled sessions
  before anyone hand-edits `exercises.ts` — the missing piece is simply
  accumulating enough labeled sessions (`npm run validation:validate`)
  to trust the result.
- **Give ground-truth labeling and human review a UI**, instead of
  CLI-only. Phase 12's `ground-truth/` importers and Phase 13's
  `human-review/submitReview()` correction flow both work end-to-end
  today (verified by hand) but there's no in-app "watch this recording,
  tell us the real rep count" or "here's your review queue" screen — a
  developer currently calls these directly or via CLI.
- **Real per-rep ground truth, not just a total count.** Phase 12's
  count-only confusion (`buildCountOnlyConfusion`) is a coarse
  approximation; per-rep timestamps unlock true precision/recall via
  `buildRepConfusionMatrix`, but nothing prompts a reviewer to capture
  them yet.
- **Persist validation data instead of flat JSON files.** Datasets,
  ground truth, calibration versions, and experiments all live under
  `.data/validation/` — fine for one developer's local iteration, not a
  team's shared benchmark history. A Prisma-backed store is the natural
  follow-up (same reasoning as Phase 11's deferred usage/subscription/
  audit persistence).
- **Progress analytics UI** (README roadmap #10) — weight & strength
  graphs, PRs, monthly reports; the read APIs Phases 7-8 built are the
  natural backend for this — no new persistence needed, just a UI.
- **Actually schedule the notifications Phase 11 built the architecture
  for.** `dispatchNotification()`/the email+in-app channels work today,
  but nothing calls `notificationScheduling`/`emailGeneration` on a real
  cadence yet (see the job-scheduler bullet above) — no UI to manage
  notification preferences either.
- **Build a "Report an issue" UI** that calls Phase 13's
  `POST /api/feedback` — the route, validation, and rate limiting all
  work today; nothing in the product surfaces it to a user yet.
  `feedback:sync` + the human-review queue are ready to receive whatever
  it collects.
- **Wire real memory sampling** so the "memory ≤ threshold" release gate
  (Phase 13) can do more than always pass with a note — nothing in this
  app measures memory usage anywhere yet, the same gap Phase 11 left
  open for its own metrics registry.
- **Persist MLOps data instead of flat JSON files.** Same limitation as
  Phase 12's `.data/validation/` — releases, golden-dataset checksums,
  review items, and feedback all live under `.data/mlops/`, fine for one
  developer, not a team's shared release history. A Prisma-backed store
  is the natural follow-up (same reasoning as Phase 11's deferred usage/
  subscription/audit persistence and Phase 12's own deferred store).
- **Start actually bumping model-registry component versions** as
  engines change, and pin a specific "known-good" benchmark run per
  golden dataset instead of comparing against whatever ran most
  recently — both are process changes (a team habit), not missing code.
- **Instrument a real "workout started" signal** so Phase 14's analytics
  can measure true abandonment (started but never finished) instead of
  only ever seeing sessions that made it to completion — needs a small,
  careful addition to `live-session.tsx`/`trainer-experience.tsx`
  (real-time, performance-sensitive components), deliberately not
  attempted this phase.
- **Give Phase 11's feature-flags a shared backing store** (Redis or a
  DB table) instead of an in-memory-per-process singleton — the concrete
  motivating case now exists: Phase 14's `rollout:start`/`rollout:stop`
  CLI scripts can't affect an already-running server without one (fixed
  for the *live-traffic* path via `POST /api/observability/rollouts`
  instead, but the CLI itself stays a scripting convenience until this
  is done).
- **Add real statistical rigor to experiment winner selection** —
  `selectWinner()` only checks a sample-size floor today, no confidence
  interval, no significance test, no correction for repeated peeking.
- **Wire a real LLM into the AI Coach.** `src/lib/coach.ts` is fully
  local/offline today (canned strings, no network calls) — the moment
  one exists, Phase 14's `cost/` LLM line item and `health/`'s
  "providers" check both start reporting real numbers with zero code
  changes to either module.
- **Build a "Report an issue" UI** that also surfaces to
  `POST /api/observability/errors`/Phase 13's feedback pipeline — see the
  Phase 13 candidate above; Phase 14's error-groups/crash-analysis are
  ready to receive whatever it collects too.
- **Gamification, admin panel** (README roadmap #12–13) — unchanged from
  the existing README roadmap, not engine-related.
