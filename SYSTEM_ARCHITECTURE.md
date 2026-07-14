# System Architecture

Next.js 16 (App Router) + React 19 + TypeScript + Prisma/PostgreSQL +
TensorFlow.js. This document covers the AI camera-trainer stack; see `README.md`
for the product overview and `prisma/schema.prisma` for the data model.

## Pose / rep-detection engine (`src/lib/pose/`)

One concern per file, each keyed by `Exercise.poseKey` where per-exercise
behavior is needed — no single file owns all exercise logic.

| Concern | File |
|---|---|
| Geometry (2D/3D angle math) | `angles.ts` |
| Body calibration (height→scale, limb lengths, framing, roll) | `calibration.ts` |
| Per-exercise rep thresholds | `exercises.ts` |
| Named rep state machine + validation | `state-machine.ts` |
| Rep state machine integration + scoring | `rep-counter.ts` |
| View-aware form-fault checks | `form-rules.ts` |
| One Euro smoothing filter | `one-euro.ts` / `smoothing-config.ts` |
| Multi-person tracking ("Body Lock") | `body-lock.ts` |
| Pose model / device-tier selection | `model-select.ts` / `device-tier.ts` |
| Camera placement recommendations | `camera-setup.ts` |
| Set debrief / fatigue heuristic | `set-analysis.ts` |

Exercise-specific behavior is driven by flat `Record<string, Config>` maps
keyed by `poseKey` (`exercises.ts`, `form-rules.ts`, `camera-setup.ts`,
`model-select.ts`'s 3D set) — a new exercise is a new config entry, not new
code. `state-machine.ts` and `calibration.ts` are pure, DOM-free functions
with no dependency on the stateful classes around them.

## Form Analysis Engine (`src/lib/pose/form-engine/`)

Independent of the Rep Engine — reads `CoachState` (already computed each
frame) for phase/state context, never counts reps, never modifies anything
in the table above. See `ALGORITHM.md` "Form Analysis Engine" for the
detection pipeline and `DEVELOPER_GUIDE.md` for how to extend it.

| Concern | File |
|---|---|
| Shared types (issues, scores, snapshots) | `types.ts` |
| Stateless per-frame joint geometry | `joint-metrics.ts` |
| Exercise-agnostic fault detectors | `issues.ts` |
| Per-exercise expected-movement profiles | `exercises/*.ts` |
| Profile registry, keyed by `poseKey` | `registry.ts` |
| Issue hysteresis (started/ongoing/resolved) + rolling stats | `temporal-tracker.ts` |
| Duration/frequency/magnitude/confidence → severity | `severity.ts` |
| Joint/Alignment/Balance/ROM/Stability/Technique/Overall scores | `scoring.ts` |
| Cooldown-gated coaching message selection | `coaching.ts` |
| Cross-session recurring-issue tracking (`localStorage`) | `weakness-tracking.ts` |
| `FormEngine` class — the one integration surface | `engine.ts` |

`use-pose-trainer.ts` owns one `FormEngine` instance per session (mirroring
its `RepCounter` instance), calls `analyzeFrame()` once per frame right after
`RepCounter.update()`, and exposes the result as `formState` plus a
`getFormAnalysis()` session-summary getter — both additive to the hook's
existing return shape. A `getFormEngineEnabled()` flag (`lib/dev.ts`, on by
default) can disable this per-frame call entirely.

## Movement Intelligence Engine (`src/lib/pose/movement-engine/`)

Sits above the Form Engine, never below it — it never touches pose
landmarks. `analyzeFrame(coachState, formSnapshot, now)` consumes only
`CoachState` and `FormAnalysisSnapshot` (which now also carries `metrics`
and `sway` for exactly this reuse — see `ALGORITHM.md` "How MIE avoids
re-deriving pose data"). No per-exercise files — this layer is exercise-
agnostic by design.

| Concern | File |
|---|---|
| Shared types (scores, snapshots, summaries) | `types.ts` |
| Velocity/acceleration/jerk from the progress signal | `kinematics.ts` |
| Left/right comparison + dominant-side tally | `symmetry.ts` |
| Issue co-occurrence → compensation events | `compensation.ts` |
| Stability score from Form Engine's exposed sway stats | `stability.ts` |
| Rep-to-rep / early-vs-late consistency (session-summary time) | `consistency.ts` |
| Smoothness/Control/Coordination/Symmetry/Consistency/Stability/Efficiency/Overall scores | `scoring.ts` |
| Early-third vs. late-third trend classification | `trend.ts` |
| Longer-cooldown, higher-level coaching | `coaching.ts` |
| `MovementEngine` class — the one integration surface | `engine.ts` |

`use-pose-trainer.ts` owns one `MovementEngine` instance per session,
calling `analyzeFrame()` right after `FormEngine.analyzeFrame()` (so it
only runs when the Form Engine does), and exposes `movementState` +
`getMovementAnalysis()` — additive to the hook's return shape, same
pattern as the Form Engine's own integration. A `getMovementEngineEnabled()`
flag (`lib/dev.ts`, on by default) can disable it independently of the
Form Engine.

## Injury Risk Engine (`src/lib/pose/injury-risk-engine/`)

The top layer: `Pose Detection -> Rep Engine -> Form Engine -> Movement
Engine -> Injury Risk Engine`. Unlike the two engines above, it's
instantiated and driven from `live-session.tsx` directly, not
`use-pose-trainer.ts` — see `ALGORITHM.md` "Where it runs" for why. Reads
only `CoachState`, `FormAnalysisSnapshot`, and `MovementAnalysisSnapshot`;
required **zero** changes to either engine below it.

| Concern | File |
|---|---|
| Shared types (risk levels, categories, snapshots, summaries) | `types.ts` |
| Rolling within-session history (rep intervals/scores/velocity, issue tallies) | `history.ts` |
| Heuristic fatigue scoring | `fatigue.ts` |
| Heuristic training-stress scoring | `load.ts` |
| Estimate confidence from history depth + Form Engine confidence | `confidence.ts` |
| 10 risk-category factors + weighted combination | `risk-model.ts` |
| Cooldown-gated recommendation selection | `recommendations.ts` |
| `InjuryRiskEngine` class — the one integration surface | `engine.ts` |
| Public barrel export | `index.ts` |

`live-session.tsx` owns one `InjuryRiskEngine` instance per session, calls
`analyzeFrame()` from a `useEffect` keyed on `movementState`/`formState`
(mirroring the Movement Engine's own coaching-cue effect pattern), and
attaches `getSessionSummary()`'s result to `SessionResult.injuryRiskAnalysis`
in `finish()`. A `getInjuryRiskEngineEnabled()` flag (`lib/dev.ts`, on by
default) can disable it independently of the other two engines. No live
end-user-facing cue this phase — dev HUD + session export only, a
deliberate scope decision (see `ALGORITHM.md` "Scope this phase").

## Performance Intelligence & Persistence Layer (`src/lib/performance/`)

The first layer in this codebase that touches a database. Runs entirely
**after** a workout, inside an API route — never during a live session,
never touching pose data. Closes the gap where Phases 4-6's rich analysis
was computed client-side but never sent to the server. See `ALGORITHM.md`
"Performance Intelligence & Persistence Layer" for the full data flow.

| Concern | File |
|---|---|
| Shared types (scores, trends, engine input/output) | `types.ts` |
| Prisma data-access layer — every `prisma.*` call for these models | `performance-store.ts` |
| 8-dimension Performance Score computation | `analytics.ts` |
| Cross-session recurring-issue tracking (server-side) | `weakness-tracker.ts` |
| Per-exercise historical aggregation | `exercise-history.ts` |
| 6-way progress classification (Rapid Improvement → Regression) | `progress.ts` |
| 9-category Personal Best detection | `personal-best.ts` |
| 7-session/30-day/90-day trend + rolling averages | `trend-analysis.ts` |
| Achievement-condition detection + award | `achievements.ts` |
| Orchestrator — the one integration surface | `performance-engine.ts` |
| Public read API (7 functions, backs `/api/performance/*`) | `session-service.ts` |
| Barrel export | `index.ts` |

`api/sessions/route.ts` and `api/workout-logs/route.ts` call
`runSessionPerformanceEngine()` right after creating the
`WorkoutSession`/`WorkoutLog` row, wrapped in a try/catch — a bug in this
newer layer can never fail the request that already saved the user's
workout. New read-only routes under `api/performance/*` expose the 7
`session-service.ts` functions.

## Personalized Learning Engine (`src/lib/personalization/`)

Above Phase 7, same post-workout timing, same "never mutate existing
output" rule — it only produces new, separate personalized data (adaptive
threshold overrides, a learned profile, weakness classifications,
predictions) that nothing currently reads yet. See `ALGORITHM.md`
"Personalized Learning Engine".

| Concern | File |
|---|---|
| Shared types | `types.ts` |
| Prisma data-access layer (own tables + read-only Phase 4-7 lookups) | `personalization-store.ts` |
| UserLearningProfile read/update | `user-profile.ts` |
| Profile-learning algorithm (experience, favorite/weakest/strongest exercises) | `learning-engine.ts` |
| Per-exercise frequency/score aggregation | `exercise-profile.ts` |
| Personalized threshold computation (25th/75th percentile of own history) | `adaptive-thresholds.ts` |
| Weakness classification over Phase 7's WeaknessHistory | `weakness-learning.ts` |
| Fatigue-curve classification | `fatigue-learning.ts` |
| Confidence/movement-quality trend + learningConfidence | `confidence-learning.ts` |
| Coaching-style preference storage only | `coach-personality.ts` |
| Recommendation effectiveness (correlation proxy) | `recommendation-learning.ts` |
| GoalProfile CRUD + goal → focus-dimension mapping | `goal-engine.ts` |
| Heuristic/statistical prediction (no LLM) | `progress-predictor.ts` |
| Orchestrator — the one integration surface | `engine.ts` |
| Barrel export | `index.ts` |

`api/sessions/route.ts` and `api/workout-logs/route.ts` call
`runPersonalizationEngine()` right after Phase 7's Performance Engine call,
in its own independent try/catch. Read-only routes under
`api/personalization/*` expose the 6 spec'd functions; two additional
write routes (`POST /api/personalization/goal`,
`POST /api/personalization/coach-style`) exist as a programmatic surface
for a future UI — no UI reads or writes this data yet.

## Trainer orchestration (`src/components/trainer/`)

- `use-pose-trainer.ts` — the inference loop (MoveNet/BlazePose,
  `requestAnimationFrame`), camera capture, telemetry, and the debug-log ring
  buffer. Owns a `RepCounter` instance per session.
- `use-camera-check.ts` — pre-workout camera quality gate (angle,
  visibility, lighting, blur, FPS) and one-shot calibration capture.
- `camera-guide.tsx` — pre-workout UI wrapping `use-camera-check`.
- `trainer-experience.tsx` → `live-session.tsx` → `session-report.tsx` —
  single-exercise session flow (setup → camera → active → report), including
  the Dev HUD and JSON/CSV debug export.
- `use-workout-recorder.ts` — canvas-composited MP4/WebM recording.

## Workout Session System (`src/components/workout-session/`)

- `experience.tsx` — multi-exercise session flow (plan → active → summary).
- `planner.tsx` / `live.tsx` — set building and live manual/AI-assisted
  tracking (`ai-set-tracker.tsx` wraps `use-pose-trainer.ts` directly — it
  does not go through `camera-guide.tsx`, so calibration for that path comes
  from whatever was last persisted via the dedicated trainer).
- `summary.tsx` — stats, PR detection, shareable card, dev JSON export.
- `src/lib/workout-session.ts` — client-side draft model, autosaved to
  `localStorage`, posted to `POST /api/workout-logs` on save.

## Persistence

- `WorkoutLog` (session) → `WorkoutSession` (per exercise) → `SessionSet`
  (per set) — Prisma nested writes from `api/workout-logs/route.ts`.
  `api/sessions/route.ts` handles the legacy single-exercise path
  (`WorkoutSession` with `workoutLogId: null`).
- **Phase 7**: `WorkoutSession` now optionally has `formAnalysis`/
  `movementAnalysis`/`riskAnalysis` (1:1, `SessionFormAnalysis`/
  `SessionMovementAnalysis`/`SessionRiskAnalysis` — normalized score
  columns + `Json` for the deep nested arrays) and a `performanceSnapshot`.
  Cross-session tables: `PerformanceSnapshot` (append-only score log),
  `WeaknessHistory`, `PersonalBest` (9 categories, distinct from the
  existing weight+reps-only `PersonalRecord`), `TrendHistory` (cached
  current-state rollup), `UserStatistics`. All additive — see
  `ALGORITHM.md` "Naming collision, resolved" and "Schema shape".
- Device-local state (never sent to the server): smoothing params
  (`forge_smoothing`), calibration profile (`forge_calibration`), dev flags
  (`forge:dev`, `forge:devhud`, `forge:engine`, `forge:strictvalidation`,
  `forge:formengine`, `forge:movementengine`, `forge:injuryriskengine`,
  `forge:exerciseintelligence`),
  session history (`forge:devsessions`), workout draft
  (`forge:workout-draft`), Form Engine cross-session weakness trends
  (`forge:form-weaknesses` — the client-only, pre-Phase-7 precursor to the
  new server-side `WeaknessHistory` table).
- Per-frame/per-rep time-series data (score history samples, issue logs,
  risk timelines) still isn't row-normalized — stored as `Json` on the
  three new `Session*Analysis` tables rather than exploded into per-sample
  rows, deliberately (see `ALGORITHM.md` "Schema shape").
- **Phase 8**: `AdaptiveThreshold` (personalized overrides, never
  overwriting any code-owned default), `UserLearningProfile` (1:1 `User`),
  `LearnedWeakness` (classification derived from Phase 7's
  `WeaknessHistory`), `RecommendationEffectiveness`, `GoalProfile` (1:1
  `User`, distinct from onboarding `Profile.goal`), `ProgressPrediction`
  (append-only). All additive — see `ALGORITHM.md` "Naming collisions,
  resolved" and "Never overwriting defaults".

## Exercise Intelligence (`src/lib/exercise-intelligence/`)

Read-only exercise-specific biomechanics metadata — sits alongside every
other engine, doesn't sit in the pipeline. No file here has a dependency on
`rep-counter.ts`, `state-machine.ts`, `form-rules.ts`, or `calibration.ts`,
and it makes no Prisma calls of its own.

| Concern | File |
|---|---|
| Shared types (ExerciseId, ExerciseProfile, etc.) | `types.ts` |
| The 21-exercise metadata table | `exercise-catalog.ts` |
| Full-profile assembly + alias normalization | `exercise-profile.ts` |
| ROM / tempo / joint / symmetry / risk / mistake builders | `rom-profile.ts`, `tempo-profile.ts`, `joint-profile.ts`, `symmetry-profile.ts`, `risk-profile.ts`, `common-mistakes.ts` |
| Movement Profile aggregation (ROM+tempo+lockout view) | `movement-profile.ts` |
| Slug/poseKey → ExerciseId resolution | `exercise-classifier.ts` |
| Public capabilities API | `exercise-capabilities.ts` |
| Snapshot facade for HUD/integration consumers | `exercise-engine.ts` |
| Barrel | `index.ts` |

Two lookup keys exist elsewhere in the app — Prisma `Exercise.slug` and the
pose layer's `poseKey` — and this module doesn't invent a third. Each
catalog entry's `aliases` list carries both, normalized (lowercased,
deduped) once at authoring time via `defineExercise()`; `exercise-
classifier.ts` builds a single alias→id `Map` once at module load, so
resolving either identifier is an O(1) lookup, never a per-frame scan or a
database call.

The capabilities API (`supportsExercise`, `getExerciseProfile`,
`getMovementProfile`, `getROMProfile`, `getTempoProfile`,
`getCommonMistakes`, `getRiskProfile`) is the intended integration surface
for the Rep, Form, Movement, Injury Risk, Performance, and Personalization
engines — but as of this phase, only the Developer HUD actually calls it
(see below). It never replaces any existing engine's score; it only
supplies metadata a consumer can choose to read.

## Production Platform (`src/lib/platform/`)

Infrastructure that sits beside every AI engine, never inside one — no
file here is on the pose/render loop, and no AI engine imports from this
tree except through the additive, opt-in call sites listed below.

| Concern | Module |
|---|---|
| Enable/disable engines, beta rollout, % rollout, remote config | `feature-flags/` |
| Sliding-window request limiting (auth/coach/session/upload/mobile presets) | `rate-limiter/` |
| Cache-aside with memory provider + Redis-shaped DI seam + 4 preset namespaces | `cache/` |
| In-process FIFO async queue | `queue/` |
| Weekly/monthly review, achievement gen, prediction refresh, email gen, notification scheduling, cleanup | `jobs/` |
| Event/timing/error recorder | `telemetry/` |
| Counter/gauge/histogram registry | `metrics/` |
| Health/readiness/liveness checks, structured logger | `monitoring/` |
| Security/compliance event log | `audit/` |
| Typed in-process pub/sub | `events/` |
| Workout reminder / achievement / weekly summary / goal reached / coach message | `notifications/` |
| Provider-agnostic billing interface + in-memory dev provider | `billing/` |
| Plan table (free/pro/elite) + per-user subscription state | `subscriptions/` |
| Monthly usage counters + quota checks | `usage/` |
| API version negotiation + deprecation headers | `api-versioning/` |
| Object storage interface + local-disk provider + signed URLs | `storage/` |
| Asset URL resolution through an optional CDN origin | `cdn/` |
| Secrets, API keys, HMAC signed payloads, request validation | `security/` |

Every module follows the same shape: a `types.ts`, one or more
implementation files, and an `index.ts` barrel exporting a lazily-created
singleton stored on `globalThis` (mirrors `src/lib/prisma.ts`'s pattern, so
state survives Next.js dev hot-reload instead of resetting on every file
edit). Nothing here makes a network call to an external provider — Redis,
Stripe/Razorpay, and S3/R2/GCS are modeled as interfaces
(`RedisLikeClient`, `BillingProvider`, `StorageProvider`) with an
in-memory/local default implementation, so wiring a real backend later is
constructing that implementation at one call site (`cache/index.ts`,
`billing/index.ts`, `storage/index.ts`), not a rewrite — see
ALGORITHM.md "Production Platform" → "Known limitations" for what's
deliberately not built yet.

**Where it's actually wired in** (everything else is available but not
force-connected, by design): `POST /api/auth/login` (rate limit by IP,
audit log, telemetry), `POST /api/sessions` and `POST /api/workout-logs`
(rate limit by user, `workout.completed` telemetry/metric/event, usage
recording), `GET /api/health`(`/ready`,`/live`), `GET /api/storage/[...key]`
(signed-URL verification), and `GET /api/platform/status` (aggregates
every module's state for the Developer dashboard's Platform page).
`notifications/` also self-wires to `events/` at module load, so
publishing `achievement.unlocked`/`goal.reached`/`coach.message` on the
event bus from anywhere triggers a notification without the publisher
knowing notifications exist.

## AI Validation & Benchmark Framework (`src/lib/validation/`)

Offline-only measurement tooling — never runs during a live session, on
the pose loop, or the render loop. Answers "how accurate is the Rep
Engine actually," not "count this rep" — it reads what an engine already
decided (a session's debug export) and, where a human-labeled ground
truth exists, scores it. No AI engine's runtime behavior changes as a
result of anything in this module.

| Concern | Module |
|---|---|
| Versioned session collections (`LabeledSession` = a debug export) | `dataset/` |
| Manually-labeled true rep count/ROM/tempo/form issues, JSON+CSV import | `ground-truth/` |
| Generic math (mean, percentile, MAE, RMSE) | `statistics/` |
| Precision/recall/F1/latency-percentile computation | `metrics/` |
| Rep-timestamp matching (or count-only fallback) → TP/FP/FN | `confusion-matrix/` |
| Per-session rep-counting, form-issue, and latency scoring | `benchmark/` |
| Per-exercise report aggregation across a whole dataset | `evaluation/` |
| Generic before/after metric-delta + regression detection | `comparison/` |
| Replays recorded decisions through a candidate required-progress fraction | `threshold-testing/` |
| Versioned candidate threshold sets, rollback, A/B testing | `calibration/` |
| Named, persisted before/after experiment records | `experiment/` |
| Ranks past experiments by F1 per pose key | `leaderboard/` |
| Flags sessions worth a human re-watch/re-label | `video-review/` |
| JSON/Markdown/CSV/HTML report rendering | `reports/` |
| Orchestrator: load dataset + ground truth → evaluate → persist reports | `validator/` |

Every file follows the same `types.ts` + implementation + `index.ts`
barrel shape as `platform/`, but **nothing here imports `"server-only"`**
— unlike `platform/`, this module must run both from a Next.js API route
(the dashboard) and from plain-Node CLI scripts (`scripts/validation/*.ts`,
run via `tsx`), and `"server-only"` isn't resolvable outside Next's own
bundler (confirmed by hand during development — `tsx` failed with
`Cannot find module 'server-only'` until it was removed from this tree).

Persistence is file-based under `.data/validation/` (datasets, ground
truth, calibration versions, experiments, rendered reports) — the same
`.data/` root Phase 11's `LocalStorageProvider` uses, now gitignored.

**`threshold-testing/`'s one real subtlety**: a recorded rep's `peak` is
expressed on *that session's own* progress scale
(`(angle - startAngle) / (activeAngle - startAngle)`, computed live by
`rep-counter.ts`). An early version of this module re-derived a
candidate's required-progress fraction from different `startAngle`/
`activeAngle` values — caught during manual smoke-testing as an
apples-to-oranges comparison (a `peak` measured on one scale compared
against a threshold meant for a different scale). Candidates now directly
override the required-progress *fraction* (or nudge each session's own
originally-recorded fraction by a relative delta) instead, which always
stays on the scale `peak` was actually measured on — see ALGORITHM.md
"Known limitations" for the full writeup.

**CLI**: `npm run validation:benchmark|validate|compare|evaluate|
calibrate|report` — see `DEVELOPER_GUIDE.md` "Running the AI Validation &
Benchmark Framework". **Dashboard**: `/settings/developer/validation` +
`GET /api/validation/status`, same auth/unlock gating as the other
Developer dashboard pages.

## AI Training & Continuous Improvement Platform (`src/lib/mlops/`)

The release-governance layer built on top of Phase 12's validation
framework — where Phase 12 answers "how accurate is this," Phase 13
answers "should this ship." Offline-only, same as Phase 12: nothing here
executes during a live session.

| Concern | Module |
|---|---|
| Version string per component (Rep/Form/Movement/Risk Engine, thresholds, exercise catalog, prompt, calibration, validation, release) | `model-registry/` |
| Coverage reports + quality score over Phase 12 datasets | `dataset-registry/` |
| Immutable (checksum-verified) benchmark datasets | `golden-datasets/` |
| Composite dataset/release quality scoring | `quality-score/` |
| Population Stability Index (categorical) + mean-shift (continuous) distribution-shift detection | `drift-detection/` |
| Ties a Phase 12 benchmark run to the model-registry snapshot active when it ran | `benchmark-registry/` |
| Thin wrapper over Phase 12's `experiment/` adding author + model-version attribution | `experiment-tracker/` |
| Orchestrates dataset load → Phase 12 evaluation → optional drift check → model-version snapshot | `evaluation-pipeline/` |
| Compares a candidate against up to 3 baselines (previous release / golden / production) | `regression-detector/` |
| The six release-gate criteria, each one named/inspectable check | `release-gates/` |
| `ReleaseCandidate` lifecycle: candidate → approved/rejected → deployed | `release-manager/` |
| Append-only deploy/rollback event log | `deployment-history/` |
| Manual review queue; a correction writes straight back to Phase 12 ground truth | `human-review/` |
| Collects user-reported issues, routes session-linked ones to review | `feedback-pipeline/` |
| Prioritizes unlabeled sessions for a human to label next | `active-learning/` |
| Aggregates every module above for the Developer dashboard | `metrics-dashboard/` |
| Generic semver parse/format/compare/bump | `versioning/` |

Same conventions as `platform/` and `validation/`: `types.ts` +
implementation + `index.ts` barrel per module, file-based persistence
under `.data/mlops/` (gitignored, alongside `.data/storage/` and
`.data/validation/`). Like `validation/`, nothing here imports
`"server-only"` — these modules run from both Next.js API routes and
plain-Node CLI scripts (`scripts/mlops/*.ts`, via `tsx`).

**One additive touch to Phase 12**: `experiment/types.ts`'s `Experiment`
interface gained two optional fields (`author`, `modelVersions`) so
`experiment-tracker/` could attribute experiments without changing
Phase 12's stored shape, function signatures, or its own CLI at all —
existing experiment JSON files remain valid with the fields simply
absent.

**Cross-phase reuse, not reinvention**: `dataset-registry/`'s difficulty
distribution reads straight from Exercise Intelligence's catalog
(Phase 10) rather than inventing a second taxonomy; `active-learning/`
flags a session's exercise as `"new-movement-pattern"` by checking
`supportsExercise()` against that same catalog — a session for an
exercise with no biomechanics profile yet is, by definition, something
this app doesn't understand well yet.

**CLI**: `npm run dataset:import|validate`, `release:create|compare|
approve`, `feedback:sync`, `drift:check`, `quality:report` — see
`DEVELOPER_GUIDE.md` "Running the AI Training & Continuous Improvement
Platform". **Dashboard**: `/settings/developer/mlops` +
`GET /api/mlops/status`. **The one end-user-facing route**:
`POST /api/feedback` (authenticated, rate-limited) — no UI calls it yet.

## AI Observability & Experimentation Platform (`src/lib/observability/`)

Explains how the AI behaves in *production* — as opposed to Phase 12
(offline benchmark accuracy against labeled datasets) and Phase 13
(release governance). Never participates in inference; builds directly
on Phase 11's telemetry/metrics/monitoring/feature-flags rather than
duplicating them.

| Concern | Module |
|---|---|
| Trace id + spans per engine per request | `trace/` |
| "Show me everything about this one workout" debug view | `sessions/` |
| Completion rate, session duration, exercise popularity, coach usage, personalization adoption, AI accuracy | `analytics/` |
| Onboarding funnel / feature adoption | `usage-analytics/` |
| DAU/WAU/MAU, streak stats | `retention/` |
| Weekly signup cohorts × week-N retention | `cohorts/` |
| Day-of-week × hour-of-day usage heatmap | `heatmaps/` |
| SHA-256 fingerprint error grouping | `error-groups/` |
| Client-crash frequency over time | `crash-analysis/` |
| Composite 0-100 health score | `health/` |
| API/engine/storage latency aggregation | `latency/` |
| Client-side FPS/inference performance (from Phase 12 datasets) | `performance/` |
| LLM/storage/bandwidth/compute cost estimates | `cost/` |
| Seven alert conditions evaluated against real state | `alerts/` |
| Deterministic N-variant assignment, shadow evaluation | `ab-testing/` |
| Live experiment lifecycle, outcome recording, winner selection | `experiments/` |
| Canary/gradual rollout state machine, drives Phase 11 feature-flags | `rollouts/` |
| Control-vs-treatment impact, expressed per 1000 users | `feature-impact/` |
| Aggregates everything above for the Developer dashboard | `dashboards/` |

Same conventions as `validation/`/`mlops/`: `types.ts` + implementation +
`index.ts` barrel, file-based persistence under `.data/observability/`,
no `"server-only"` import anywhere (must run from both API routes and
`scripts/observability/*.ts` CLI scripts).

**A significant fix discovered while building this phase**: wiring
`health/`/`cost/`/`rollouts/` required importing deeply from
`src/lib/platform/` (Phase 11) for the first time from code that also
needs to run under plain-Node CLI scripts — and Phase 11's files still
had `import "server-only"`, which broke immediately (`Cannot find module
'server-only'`) the same way Phase 12/13 discovered for their own trees.
Fixed by removing it from all 46 files under `src/lib/platform/` — a pure
marker removal, zero behavior change, verified by a clean `tsc --noEmit`
and `npm run build` both before and after.

**Real integration, not just infrastructure**: `POST /api/sessions` and
`POST /api/workout-logs` now open a trace, add presence spans for the
four client-side pose engines, wrap the Performance/Personalization
Engine calls in *timed* spans, record real API-level timing via Phase
11's `telemetry.recordTiming()`, and close the trace before responding —
verified by hand end-to-end. `storage/local-provider.ts`'s `put`/`get`
now wrap their existing bodies in the same timing helper.
`error.tsx`/`global-error.tsx` now report to `error-groups/` via
`POST /api/observability/errors`.

**Rollouts genuinely drive live feature flags — with an important
caveat, found by testing, not assumed.** `rollouts/startRollout()`/
`advanceRollout()`/`rollbackRollout()` call Phase 11's
`featureFlagStore.setRule()` directly, and `isEnabled()` reflects the
change immediately — verified within a single process. But
`scripts/observability/rollout-start.ts`/`rollout-stop.ts` run as
separate one-off `tsx` processes, and Phase 11's flag store is an
in-memory singleton with no cross-process backing — so the CLI's changes
never reach an already-running `next dev`/`next start` server. The fix:
`POST /api/observability/rollouts`, which executes *inside* the live
server process and so genuinely changes what real traffic sees on that
instance (still per-instance, not shared across a horizontally-scaled
deployment — the same limitation Phase 11's feature-flags always had).

**CLI**: `npm run observability:status|experiments:create|
experiments:compare|rollout:start|rollout:stop|alerts:test|cost:report|
health:report` — see `DEVELOPER_GUIDE.md` "Running the AI Observability &
Experimentation Platform". **Dashboard**: `/settings/developer/observability`
+ `GET /api/observability/status`. **End-user-facing routes**:
`POST /api/observability/errors` (unauthenticated, rate-limited by IP —
an error boundary can fire before login) and `POST /api/observability/
rollouts` (authenticated — the one genuinely live-traffic-affecting route
in this phase).

## Authentication & Session Security (Phase 15)

Stateless JWT session cookie (`jose`, HS256, 7-day expiry, `httpOnly` +
`sameSite=lax` + `secure` in production), bcryptjs password hashing (cost
12), optional Google OAuth. Hardened this phase for real-user exposure:

- **Fail-closed secrets** (`src/lib/jwt.ts`, `src/lib/platform/security/
  secrets.ts`): `JWT_SECRET` and `SIGNING_SECRET` throw at module load in
  production if unset, via `requireEnv()`. A dev-only insecure fallback
  remains for local convenience (`NODE_ENV !== "production"` only).
- **Session revocation via `tokenVersion`**: `User.tokenVersion` (Int,
  default 0) is embedded in the session JWT and re-checked against the DB
  on every `getSession()` call (`src/lib/auth.ts`) — deduped per-request via
  React's `cache()`, so the cost is one indexed lookup, not one per caller.
  Bumping a user's `tokenVersion` (password change, "log out everywhere",
  account deletion) instantly invalidates every outstanding JWT for that
  user, without a Redis-backed blacklist. This is the mechanism that makes
  a leaked/stolen token revocable instead of valid until natural expiry.
- **Enforced email verification**: `POST /api/auth/login` now 403s with
  `code: "EMAIL_NOT_VERIFIED"` if `user.emailVerified` is null. Signup still
  creates an immediate session (existing UX — verification email sent
  async), but once a user logs out, they cannot log back in until verified.
  `POST /api/auth/resend-verification` (enumeration-safe, rate-limited)
  lets the login page's "Resend" action re-send the link.
- **Rate limiting** extended from login-only to every auth-adjacent route,
  each on its own sub-bucket of the existing `RATE_LIMIT_PRESETS.auth`
  preset (`src/lib/platform/rate-limiter`) so one endpoint's abuse can't
  exhaust another's quota for the same IP: `auth:signup`,
  `auth:forgot-password`, `auth:resend-verification`, `auth:google-link`
  (login's original bucket, plain `"auth"`, is unchanged).
- **Google OAuth CSRF (`state` param)**: `GET /api/auth/google` now mints a
  random `state`, stored in a short-lived httpOnly cookie
  (`GOOGLE_OAUTH_STATE_COOKIE`, `src/lib/google.ts`), verified on
  `GET /api/auth/google/callback` before exchanging the auth code.
- **No silent Google account linking**: previously, a Google sign-in whose
  email matched an existing password account was linked automatically —
  an account-takeover vector (anyone who controls a victim's email address
  could complete Google OAuth and gain access). Now the callback signs a
  short-lived (5 min) JWT via `src/lib/google-link.ts` carrying the pending
  Google identity and redirects to `/login/link-google`, where the user
  must enter their existing password before `POST /api/auth/google/link`
  performs the link + creates the session. Nothing is persisted for the
  pending link — the token itself carries the payload, so no schema change
  was needed for this ephemeral confirmation step.
- **Security headers** (`next.config.ts` `headers()`): HSTS,
  `X-Content-Type-Options`, `X-Frame-Options: DENY`,
  `Referrer-Policy`, and a CSP scoped to what the app actually needs
  (`unsafe-inline`/`unsafe-eval` for Next's dev overlay + TF.js/WASM;
  `blob:` for camera-frame processing).
- **CSRF, generally**: no token-based CSRF middleware was added. The
  session cookie is `sameSite=lax`, which already blocks the classic
  cross-site `<form>`-POST CSRF vector for JSON API routes, and the one
  real gap (the OAuth authorize step, which isn't cookie-authenticated) is
  closed by the `state` param above. Revisit if a cross-site mutation
  surface beyond JSON POSTs is ever added.

## Admin/Internal Access Control (Phase 16)

Every internal status/control route built in Phases 11–14
(`GET /api/{platform,mlops,validation,observability}/status`,
`POST /api/observability/rollouts`) previously only checked that a
request was authenticated — any logged-in beta user could call them,
including the one *mutating* route (`rollouts`), which could start,
advance, or roll back a live feature-flag rollout on the running
instance. `requireAdmin()` (`src/lib/auth.ts`) now gates all five: 401 if
no session, 403 if `session.role !== "ADMIN"`.

The six `/settings/developer/*` pages (index + history/platform/
validation/mlops/observability dashboards) had the same gap one layer up
— each only checked `localStorage["forge:dev"]` client-side, which any
authenticated user could set on themselves. `src/app/(app)/settings/
developer/layout.tsx` is the real fix: a Server Component that calls
`getCurrentUser()` (live DB role, not the JWT's — a role change takes
effect immediately, unlike `tokenVersion`-checked session validity which
is about revocation, not privilege escalation) and renders a blocked
message instead of `children` for a non-admin once `NODE_ENV ===
"production"`. The `NODE_ENV !== "production"` local-dev unlock is
unchanged. `/admin` itself was already gated server-side by `src/proxy.ts`
(`role !== "ADMIN"` → redirect), so it needed no additional change this
phase — only its content is still a stub (Phase 22).

## Deployment (Phase 26)

Render, as a native Node web service — no Docker (the only dependency
that would need one, `@tensorflow/tfjs-node`, isn't used; the app only
uses the pure-JS/WASM `@tensorflow/tfjs`, client-side). See
`docs/DEPLOYMENT.md` for the full setup checklist. Two things worth
recording here since they're architectural, not just operational:

- **`output: "standalone"`** (`next.config.ts`) — Render runs
  `node .next/standalone/server.js` directly rather than `next start`.
  Standalone output deliberately excludes `public/` and `.next/static/`
  (Next's own documented behavior); `scripts/copy-standalone-assets.ts`
  copies them in as an automatic `postbuild` step, verified end-to-end
  by actually running the standalone server locally (health check +
  a real page + static asset all served correctly) rather than trusting
  the build output alone.
- **`.data/` durability**: this app has four subsystems that persist to
  flat files under `.data/` (`platform/`, `validation/`, `mlops/`,
  `observability/`), all built across Phases 11–14 with file-based
  storage as a deliberate, documented placeholder for a future
  Postgres-backed store (see each phase's `ROADMAP.md` entry). Render's
  web services have an **ephemeral filesystem** by default — `.data/`
  resets on every deploy/restart unless a persistent disk is attached.
  Of everything under `.data/`, only `observability/error-groups/`
  (crash-report history, Phase 25) is worth paying for a persistent disk
  at 100-user beta scale — `mlops/`/`validation/` are internal
  engineering tooling with no end-user visibility, and the rest of
  `observability/` (rollouts/experiments/alerts/trace/cost) resets
  harmlessly (a reset rollout just means re-running `rollout:start`).
  Full table in `docs/DEPLOYMENT.md` §3.

## Developer / debug tooling

- `src/lib/dev.ts` — flag storage (unlock, HUD, engine override, strict
  validation, Form/Movement/Injury-Risk Engine on/off, Exercise
  Intelligence on/off).
- Live Dev HUD (`live-session.tsx`) — FPS/inference sparklines, pipeline
  status, rep-engine internals (angle, progress, state machine, validation
  checklist), a FORM ENGINE section (scores, active issues with severity/
  confidence/duration, current coaching message), a MOVEMENT ENGINE section
  (movement scores, dominant side, velocity, active compensation events,
  current coaching message), and an INJURY RISK ENGINE section (overall
  risk, risk score, confidence, fatigue, active compensation count, top
  reasons, current recommendation), rendered only when unlocked + enabled.
- JSON/CSV debug export (`session-report.tsx`'s `exportDebug`/`exportCsv`,
  `workout-session/summary.tsx`'s `exportAiLogs`) — stamps exercise config,
  `REP_TUNING`, smoothing params, and calibration profile alongside the full
  per-frame event log, plus (additive) the Form Engine's per-rep scores,
  issue log, score history, coaching events, the Movement Engine's scores,
  score history, consistency/symmetry/compensation/trend summaries, and the
  Injury Risk Engine's risk timeline, highest/average risk, risk trend,
  most common causes, and recommendation history — so any threshold
  discussion is tied to the exact values and data a session ran with.
- **Phase 7's PERFORMANCE ENGINE section lives in `session-report.tsx`,
  not the live Dev HUD** — unlike the three pose engines, this layer has no
  data until the workout POSTs and the server responds, so there's nothing
  to show during a live session. Shows workout score, progress, trend, PR
  count, top weakness trend, and history count, sourced from the API
  response; also folded into `exportDebug()`/`exportCsv()`.
- **Phase 8's PERSONALIZATION ENGINE section** lives right below it in the
  same file, same reasoning (no data until the POST response returns).
  Shows learning confidence, goal, coach style, prediction, adaptive
  thresholds, and recovered/persistent weakness counts; also folded into
  `exportDebug()`/`exportCsv()`.
- **Phase 14's Observability dashboard** (`/settings/developer/observability`)
  is the one dashboard in this family with two write paths behind it
  (`POST /api/observability/errors` and `POST /api/observability/
  rollouts`) rather than being purely read-only like the other three —
  see "AI Observability & Experimentation Platform" above.
- **Phase 13's MLOps dashboard** (`/settings/developer/mlops`) reads from
  `.data/mlops/` files written by the CLI scripts (`release:create`,
  `dataset:validate`, etc.) — same "displays, never triggers a run"
  pattern as the Validation dashboard.
- **Phase 12's Validation dashboard** (`/settings/developer/validation`)
  reads exclusively from `.data/validation/` files written by the CLI
  scripts — it never triggers a benchmark run itself, only displays the
  most recent one (`GET /api/validation/status`).
- **Phase 11's Platform dashboard** (`/settings/developer/platform`) is a
  separate page, not a live-session HUD section — its data (health, cache,
  queues, jobs, flags, rate limits, metrics, subscription/usage) lives in
  the Node process, not per-frame pose state, so it's fetched on demand
  from `GET /api/platform/status` rather than rendered every frame. Linked
  from the main Developer settings page alongside the session history
  dashboard.
- **Phase 10's EXERCISE INTELLIGENCE section** lives in the live Dev HUD
  (`live-session.tsx`), unlike Phases 7-8 — it has data as soon as the
  exercise is known (no need to wait for a POST response), so it's shown
  alongside the pose engines' sections. Resolves once per exercise via
  `getExerciseIntelligenceSnapshot(exercise.poseKey ?? exercise.slug)` and
  shows movement pattern, ROM range, tempo envelope, overall risk
  sensitivity, difficulty, and the top 3 common mistakes. Gated by its own
  `forge:exerciseintelligence` flag, independent of the pose engine flags.
