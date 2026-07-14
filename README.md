# 🔥 FORGE — AI Fitness Trainer

A premium, AI-powered fitness trainer web app with a dark luxury gym aesthetic.
Real-time form correction, automatic rep counting, personalized plans, and a
cinematic command-center dashboard.

> **Status:** Milestones 1–14 shipped — Foundation & Auth, Exercise Database &
> Workout Creator, AI Camera Trainer, the Workout Session System (live gym
> sessions, training log, shareable summary cards), the Form Analysis Engine
> (continuous technique scoring, error detection, live coaching), the
> Movement Intelligence Engine (smoothness, symmetry, consistency, and
> compensation analysis over the whole set), the Injury Risk Engine
> (short-term movement-risk estimation), the Performance Intelligence &
> Persistence Layer (server-side scoring, progress trends, personal bests,
> achievements), the Personalized Learning Engine (adaptive per-user
> thresholds, learned profile, progress prediction), the Exercise
> Intelligence Engine (read-only exercise-specific biomechanics metadata for
> 21 exercises), the Production Platform (feature flags, rate limiting,
> caching, background jobs, telemetry/metrics, health checks, audit
> logging, notifications, billing/subscriptions/usage, storage, and
> security — infrastructure only, zero AI algorithm changes), the AI
> Validation & Benchmark Framework (offline precision/recall/F1 scoring,
> threshold A/B testing, and regression detection against human-labeled
> sessions — never runs live, zero AI algorithm changes), the AI
> Training & Continuous Improvement Platform (model registry, golden
> datasets, drift/regression detection, release gates, human review, and
> active learning governing releases of the AI stack — offline only, zero
> AI algorithm changes), and the AI Observability & Experimentation
> Platform (distributed tracing, real production/user analytics, cost and
> latency dashboards, error grouping, health scoring, alerting, and a live
> A/B experiment/rollout platform — never participates in inference, zero
> AI algorithm changes). Progress analytics UI and gamification are next
> on the roadmap below.

---

## Tech Stack

| Layer        | Choice                                                      |
| ------------ | ---------------------------------------------------------- |
| Framework    | **Next.js 16** (App Router) + React 19 + TypeScript        |
| Styling      | **Tailwind CSS v4** custom design system (glassmorphism)   |
| Backend      | Next.js Route Handlers + Server Components (full-stack)    |
| Database     | **PostgreSQL** + **Prisma 6** ORM                          |
| Auth         | Custom **JWT** (jose) + **Google OAuth** + email verify    |
| Animation    | Framer Motion                                              |
| Charts       | Recharts                                                   |
| AI (planned) | OpenAI API · TensorFlow MoveNet / MediaPipe (pose)         |
| Billing      | Stripe (test mode) + in-memory mock fallback               |
| Testing      | Playwright (E2E) · GitHub Actions CI                       |
| Deployment   | Render (standalone Node output)                            |

---

## Quick Start

```bash
# 1. Install deps (already done if scaffolded)
npm install

# 2. Configure environment
cp .env.example .env
#   → set DATABASE_URL to a Postgres instance (Neon / Supabase / local)
#   → JWT_SECRET/SIGNING_SECRET have insecure dev-only fallbacks locally,
#     but MUST be set to real random values in production (the app fails
#     to boot without them there); set Google + SMTP keys when ready

# 3. Create tables and seed the exercise library
npm run db:push
npm run db:seed

# 4. Run
npm run dev          # http://localhost:3000
```

### Useful scripts

| Script              | Purpose                              |
| ------------------- | ------------------------------------ |
| `npm run dev`       | Dev server                           |
| `npm run build`     | Production build (auto-runs `postbuild` to prep `output: "standalone"`) |
| `npm run start:standalone` | Run the exact artifact Render deploys (`node .next/standalone/server.js`) |
| `npm run typecheck` | `tsc --noEmit`                       |
| `npm run lint`      | `eslint .`                            |
| `npm run test:e2e`  | Playwright E2E suite (starts its own server) |
| `npm run db:push`   | Sync schema to DB (no migration)     |
| `npm run db:migrate`| Create a migration                   |
| `npm run db:seed`   | Seed exercises + achievements        |
| `npm run db:studio` | Prisma Studio GUI                    |
| `npm run validation:benchmark <dataset>` | Console accuracy summary for a labeled dataset |
| `npm run validation:validate <dataset> <file>` | Import ground-truth labels (JSON/CSV) |
| `npm run validation:evaluate <dataset>` | Persist JSON+Markdown per-exercise reports |
| `npm run validation:report <dataset>` | Persist all 4 report formats (JSON/MD/CSV/HTML) |
| `npm run validation:compare <a.json> <b.json>` | Diff two saved reports, flag regressions |
| `npm run validation:calibrate <dataset> <poseKey> <file>` | A/B test a candidate threshold |
| `npm run dataset:import <dataset> <sessionFile>` | Add a debug-export session to a dataset |
| `npm run dataset:validate <dataset>` | Coverage report + quality score |
| `npm run release:create <name> <dataset>` | Evaluate, gate-check, and save a release candidate |
| `npm run release:compare <idA> <idB>` | Diff two release candidates' reports |
| `npm run release:approve <releaseId>` | Approve a release (blocked if gates failed, unless `--force`) |
| `npm run feedback:sync` | Route session-linked feedback into the human-review queue |
| `npm run drift:check <baseline@v> <current@v>` | PSI/mean-shift drift report between two datasets |
| `npm run quality:report` | Print dataset + release quality scores |
| `npm run observability:status` | Health, experiments, rollouts, latency, cost, alerts, errors, retention |
| `npm run experiments:create <key> <name> <metric> <variant:weight...>` | Create a live A/B experiment |
| `npm run experiments:compare <experimentId>` | Results, winner, and feature impact for an experiment |
| `npm run rollout:start <flagKey> <stages>` | Start a canary rollout (or advance an existing one) |
| `npm run rollout:stop <rolloutId>` | Roll back a rollout to 0% |
| `npm run alerts:test` | Fire a synthetic alert + check real alert conditions |
| `npm run cost:report` | LLM/storage/bandwidth/compute cost estimate |
| `npm run health:report` | Composite platform health score |

> No SMTP configured? Verification / reset **links are printed to the server
> console** in development, so you can complete the flow without an email server.

---

## Folder Structure

```
src/
├── app/
│   ├── (app)/                  # Authenticated shell (sidebar layout)
│   │   ├── layout.tsx          #   getCurrentUser guard + Sidebar
│   │   ├── dashboard/          #   Command-center dashboard
│   │   ├── exercises/          #   Library list + [slug] detail
│   │   ├── progress/ profile/ settings/ admin/
│   ├── api/
│   │   ├── auth/               # signup, login, logout, me, verify,
│   │   │                       #   forgot/reset-password, google[/callback]
│   │   └── onboarding/         # POST profile → metrics + plan
│   ├── login/ signup/ forgot-password/ reset-password/
│   ├── onboarding/             # Multi-step wizard
│   ├── page.tsx                # Landing
│   ├── layout.tsx  globals.css # Root layout + design system
├── components/
│   ├── ui/                     # button, input, label, glass-card, progress-ring
│   ├── auth/                   # auth-shell, google-button
│   ├── onboarding/             # option-grid, chip-group
│   ├── app/                    # sidebar, coming-soon
│   ├── dashboard/              # weekly-chart
│   └── brand.tsx
├── lib/
│   ├── prisma.ts  jwt.ts  auth.ts  auth-constants.ts
│   ├── google.ts  email.ts  tokens.ts
│   ├── validators.ts (zod)  fitness.ts (BMI/BMR/score/plan)  utils.ts
│   └── ...
└── proxy.ts                    # Route protection (Next 16 "proxy" middleware)
prisma/
├── schema.prisma               # Full data model
├── seed.ts                     # Loads exercises + equipment + achievements
└── data/
    ├── exercises.ts            # 120 exercises (every discipline) w/ AI flags
    └── equipment.ts            # 34 equipment & machine catalog entries
```

---

## Database Schema (overview)

Defined in [`prisma/schema.prisma`](prisma/schema.prisma):

- **User** — auth, role, gamification snapshot (xp, level, streak)
- **Token** — email-verify & password-reset tokens
- **Profile** — onboarding answers + computed `bmi`, `bmr`, `dailyCalories`, `fitnessScore`
- **Exercise** — 120-exercise library: primary/secondary muscles, instructions,
  mistakes, form tips, beginner mod, advanced variations, disciplines, `metValue`,
  `poseKey`, and AI flags (`aiPosture`/`aiRepCount`/`aiRom`/`aiFeedback`)
- **Equipment** — equipment & machine catalog (typed)
- **WorkoutPlan → PlanDay → PlanExercise** — generated weekly split
- **CustomWorkout → CustomWorkoutExercise** — user-built workouts (favorites, program type)
- **WorkoutSession → SessionSet** — logged sessions + AI scores (form/ROM/tempo)
- **ProgressEntry**, **PersonalRecord** — tracking & PRs
- **Achievement / UserAchievement**, **Notification** — gamification & alerts

---

## API Routes

| Method | Route                          | Purpose                               |
| ------ | ------------------------------ | ------------------------------------- |
| POST   | `/api/auth/signup`             | Create account, session, verify email |
| POST   | `/api/auth/login`              | Credentials login (403 if unverified) |
| POST   | `/api/auth/logout`             | Clear session                         |
| GET    | `/api/auth/me`                 | Current user (401 if anon)            |
| GET    | `/api/auth/verify?token=`      | Confirm email                         |
| POST   | `/api/auth/resend-verification`| Resend verification link              |
| POST   | `/api/auth/forgot-password`    | Send reset link                       |
| POST   | `/api/auth/reset-password`     | Set new password                      |
| GET    | `/api/auth/google`             | Start Google OAuth                    |
| GET    | `/api/auth/google/callback`    | OAuth callback → session, or → link-confirm if email matches an existing password account |
| POST   | `/api/auth/google/link`        | Confirm password to link Google to an existing account |
| POST   | `/api/onboarding`              | Save profile, compute metrics + plan  |
| GET    | `/api/workouts`                | List the user's custom workouts       |
| POST   | `/api/workouts`                | Create a custom workout               |
| PATCH  | `/api/workouts/[id]`           | Toggle favorite                       |
| DELETE | `/api/workouts/[id]`           | Delete a custom workout               |

---

## Security & Access Rules

- **No access without login.** `src/proxy.ts` gates every non-public path.
- Unauthenticated → redirected to `/login?redirect=<path>`.
- Authenticated but not onboarded → forced to `/onboarding`.
- `/admin/*` requires `role = ADMIN`.
- Sessions are **HTTP-only JWT cookies** (7-day expiry, jose HS256),
  revocable server-side via a per-user `tokenVersion` check on every
  request (password change / "log out everywhere" / account deletion all
  bump it, instantly invalidating outstanding tokens).
- Passwords hashed with **bcrypt** (cost 12). Reset/verify tokens are single-use.
- Login is blocked until the account's email is verified.
- Signup/login/forgot-password/resend-verification/Google-link are all
  rate-limited per IP, on separate sub-buckets.
- Google sign-in never silently links to an existing password account —
  the user must confirm with their password first.
- Security response headers (HSTS, CSP, X-Frame-Options, etc.) are set
  app-wide via `next.config.ts`.

---

## Roadmap

1. ✅ **Foundation · Auth · Onboarding**
2. ✅ **Exercise Database & Workout Creator** — 120 exercises, equipment catalog,
   filters/AI badges, custom workouts + program templates.
3. ✅ **AI Camera Trainer** — full-screen MoveNet/BlazePose hybrid pose detection,
   automatic rep counting, range-of-motion + posture scoring, real-time voice
   coaching, rest timers, and a post-session report (score /10, form/tempo/ROM,
   calories, XP). Routes: `/train/[slug]` (immersive, no chrome) + `POST /api/sessions`.
4. ✅ **Workout Session System** — plan a full titled gym session (per-set
   weight × reps), track it live (elapsed time, volume, rest timers, optional
   embedded AI rep counting per exercise — never mandatory), auto-save drafts to
   localStorage, PR detection + XP on finish, AI coach summary, an
   Instagram-story shareable card, and a complete training log under
   `/profile/history`. Routes: `/workout` + `POST /api/workout-logs`.
5. ✅ **Intelligent Form Analysis Engine** — continuous, whole-rep technique
   scoring (Joint/Alignment/Balance/ROM/Stability/Movement Quality/Technique/
   Overall), 22 detectable technique issues with severity + confidence across
   9 exercise families, temporal smoothing, cooldown-gated live coaching, and
   device-local weakness tracking across sessions. See `ALGORITHM.md`.
6. ✅ **Movement Intelligence Engine** — whole-set movement analysis above
   the Form Engine: smoothness/acceleration/jerk kinematics, left/right
   symmetry with dominant-side detection, a 7-rule compensation-pattern
   detector, rep-to-rep and early-vs-late-set consistency drift, and
   improving/degrading/stable trend classification across 8 movement
   scores. Foundation for a future Injury Risk Engine. See `ALGORITHM.md`.
7. ✅ **Injury Risk Engine** — the top layer of the runtime pipeline,
   estimating short-term movement risk (LOW/MODERATE/HIGH) from fatigue,
   load, and confidence heuristics across 10 risk categories, with
   cooldown-gated recommendations. Dev HUD + session export only — no
   consumer-facing risk surface yet. See `ALGORITHM.md`.
8. ✅ **Performance Intelligence & Persistence Layer** — the first layer to
   persist workout data: server-side Performance Scores (8 dimensions),
   6-way progress trends, cross-device weakness tracking, a 9-category
   Personal Best engine, 7-session/30-day/90-day trend analysis, and
   achievements — all computed after a workout ends, never during a live
   session. See `ALGORITHM.md`.
9. ✅ **Personalized Learning Engine** — an adaptive layer above Phase 8
   that learns what's normal for each user: a long-term profile,
   personalized adaptive thresholds (never overwriting any default),
   weakness classification, fatigue-curve learning, goal-adapted focus
   mapping, coaching-style preference, and heuristic progress prediction.
   Runs only after a workout; no UI consumes it yet — see `ALGORITHM.md`.
10. ✅ **Exercise Intelligence Engine** — a read-only exercise-specific
    biomechanics metadata layer (ROM, tempo, joint involvement, symmetry,
    risk sensitivity, common mistakes) for 21 exercises, sitting alongside
    every existing engine rather than inside the pipeline. Exposes a
    capabilities API the Rep/Form/Movement/Injury-Risk/Performance/
    Personalization engines can adopt; this phase itself only wires it
    into the Dev HUD — see `ALGORITHM.md`.
11. ✅ **Production Platform** — 18 infrastructure modules sitting beside
    every AI engine: feature flags (rollout %, user overrides), rate
    limiting, caching, background jobs, telemetry/metrics, health checks,
    audit logging, a typed event bus, notifications, billing/
    subscriptions/usage tracking, API versioning, object storage with
    signed URLs, CDN passthrough, and security helpers. Zero AI algorithm
    changes; real cloud providers (Redis/Stripe/S3-compatible) aren't
    wired up yet — every interface has a working local default instead.
    New `/settings/developer/platform` dashboard. See `ALGORITHM.md`.
12. ✅ **AI Validation & Benchmark Framework** — offline-only tooling that
    scores the Rep Engine's counting accuracy (precision/recall/F1) and
    Form Engine issue detection against human-labeled recorded sessions,
    per exercise. Threshold testing replays recorded decisions through
    the real `buildValidation()` function to A/B test candidate
    thresholds without touching `exercises.ts`. Six CLI scripts
    (`npm run validation:*`) plus a `/settings/developer/validation`
    dashboard. Never runs during a live session; zero AI algorithm
    changes. See `ALGORITHM.md`.
13. ✅ **AI Training & Continuous Improvement Platform** — release
    governance on top of Phase 12: a model registry tracking a version
    per engine/threshold/catalog component, dataset coverage/quality
    scoring, immutable checksum-verified golden datasets, PSI-based drift
    detection, regression detection against up to three baselines,
    six-criteria release gates, a release lifecycle with deployment
    history, a human-review queue whose corrections write straight back
    to ground truth, a feedback pipeline, and active-learning
    prioritization for unlabeled sessions. Eight CLI scripts plus a
    `/settings/developer/mlops` dashboard. Offline only; zero AI
    algorithm changes. See `ALGORITHM.md`.
14. ✅ **AI Observability & Experimentation Platform** — distributed
    tracing (a trace + spans per engine on every session save), real
    production/user analytics from Prisma (completion rate, exercise
    popularity, coach usage, personalization adoption, DAU/WAU/MAU,
    cohort retention, usage heatmaps, onboarding funnel), a cost
    dashboard, a latency dashboard, error grouping wired into the app's
    error boundaries, a composite health score, seven-condition
    alerting, and a live A/B experiment/rollout platform that genuinely
    drives the Production Platform's feature flags. Eight CLI scripts
    plus a `/settings/developer/observability` dashboard. Never
    participates in inference; zero AI algorithm changes. See
    `ALGORITHM.md`.
15. **Progress analytics UI** — weight & strength graphs, PRs, monthly
    reports (the backend for this already exists — see Phases 8-9 above).
16. **Gamification** — XP, levels, streaks, badges, achievements.
17. ✅ **Admin panel** — real `/admin` dashboard (health, DAU/WAU/MAU,
    completion rate, adoption metrics, top errors, a paginated users
    table) — see Phase 22 below. Exercise-library management/AI-report
    review UI not built yet.
18. ✅ **AI Trainer v1 Beta — production hardening (Phases 15–27)** — a
    dedicated push distinct from every phase above: no new AI engines,
    safe to hand to 100 real users. Fail-closed JWT/signing secrets,
    `tokenVersion`-based session revocation, enforced email
    verification, rate limiting across every auth route, no more silent
    Google-account auto-linking, security headers; admin-only gating on
    every internal status/control route and the Developer dashboards;
    the full pre-existing 51-problem ESLint baseline fixed to zero;
    shared loading/empty-state components + route-local skeletons;
    an accessibility pass (form-error `role="alert"`, missing labels,
    avatar alt text); account settings + immediate hard-delete account
    deletion; a `Subscription` Prisma model + Stripe test-mode billing
    scaffolding (real charging deferred post-beta by design); the admin
    dashboard itself; `next/image` + bundle/N+1/caching audit; this
    project's first-ever automated tests (5 Playwright E2E specs) and
    first-ever CI pipeline; completed crash reporting (global
    `window.onerror`/`unhandledrejection` capture); Render deployment
    prep (`output: "standalone"`, automatic asset-copy `postbuild`,
    `.data/` persistent-disk durability plan); and a release checklist.
    See `CHANGELOG.md` (Phases 15–27) for the full detail, and
    `docs/DEPLOYMENT.md`/`docs/RELEASE_CHECKLIST.md` for shipping it.

---

## Verification status

- `npm run typecheck` — ✅ passes
- `npm run build` — ✅ all routes compile, `postbuild` produces a
  working `output: "standalone"` bundle (verified by actually running
  `node .next/standalone/server.js` — health check, a real page, and
  static assets all confirmed served correctly)
- `npx eslint .` — ✅ zero problems (was a 51-problem baseline before
  Phase 17's cleanup)
- `npx playwright test` — ✅ 5/5 E2E specs pass (signup/login,
  onboarding, workout session, account deletion) against the real dev
  database; not yet run in CI for real (needs repo secrets — see
  `docs/RELEASE_CHECKLIST.md`)
- Runtime smoke test — ✅ public pages 200, protected routes 307→`/login`,
  `/api/auth/me` 401, input validation 400. Full DB flow requires `DATABASE_URL`.
