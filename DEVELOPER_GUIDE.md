# Developer Guide

Practical, task-oriented notes for working in this codebase. For the "what
exists and why" narrative, see `SYSTEM_ARCHITECTURE.md`; for the rep-counting
and form-analysis algorithms specifically, see `ALGORITHM.md`.

## Adding a new exercise to the Form Analysis Engine

The Form Engine (`src/lib/pose/form-engine/`) works for *any* `poseKey` out
of the box — `issues.ts`'s generic detectors (uneven hips/shoulders, knee
valgus/varus, head/neck position, balance, heel/toe lift) run for every
exercise automatically. A dedicated profile only adds exercise-specific
checks on top.

To add one:

1. Create `src/lib/pose/form-engine/exercises/<name>.ts` exporting an
   `ExerciseFormProfile`:

   ```ts
   import { magnitude, raw, type Bands } from "../issues";
   import type { ExerciseDetectContext, ExerciseFormProfile, RawIssue } from "../types";

   export const myLiftProfile: ExerciseFormProfile = {
     expectedModel: "One sentence describing the ideal movement.",
     detect(ctx: ExerciseDetectContext): RawIssue[] {
       const { metrics: m, mode, repPhase } = ctx;
       const out: (RawIssue | null)[] = [];
       // ...raw(id, magnitude(value, warn, error, dir), confidence, joints, cue)
       return out.filter((r): r is RawIssue => r != null);
     },
   };
   ```

2. Pick `IssueId`s from the existing catalog in `types.ts` where they fit
   (don't invent a new one unless the fault genuinely isn't covered — check
   `types.ts`'s `IssueId` union first).

3. Register it in `registry.ts`, keyed by every `poseKey` that should use it
   (mirrors `src/lib/pose/exercises.ts`'s `CONFIGS` pattern).

4. Set conservative first-pass thresholds. **Do not guess "correct"
   biomechanical numbers** — reuse the band philosophy of an existing profile
   if the fault is similar (e.g. `roundedBack` reuses the same
   `[148,132]/[158,144]` bands across squat/deadlift/row/push-up), and expect
   to revise once real gym-tested debug exports are available (see "Tuning
   workflow" below).

5. Run `npx tsc --noEmit` — the module is fully typed; a missing field on
   `ExerciseDetectContext` or a typo'd `IssueId` fails to compile.

## Reading the FORM ENGINE HUD section

Visible in a live session when Developer mode + "Live debug HUD" are both
enabled (`/settings/developer`). Shows, in order: the eight scores (overall,
joint/alignment, balance/stability), current movement phase, per-frame
confidence, up to 4 currently-active issues (id, severity, confidence,
duration), and the current coaching message if one is showing. Backed by
`formState` from `usePoseTrainer()` — see `use-pose-trainer.ts`'s
`analyzeFrame()` call site if you need to trace a value back to its source.

## Extending the debug export

Both export paths are additive-only — add a new key, never repurpose an
existing one, so older exports stay parseable:

- Single-exercise trainer: `session-report.tsx`'s `exportDebug()`/`exportCsv()`,
  fed by `SessionResult.formAnalysis` (set in `live-session.tsx`'s `finish()`
  via `getFormAnalysis()`).
- Freeform workout builder: `workout-session/summary.tsx`'s `exportAiLogs()`,
  fed by `AiLogChunk.formAnalysis` (set in `ai-set-tracker.tsx`'s unmount
  flush via the same `getFormAnalysis()` getter).

`SessionFormSummary` (`types.ts`) is the shape in both cases: scores, score
history, per-rep summaries, the full issue log (with severity/duration/
occurrences), top issues, and cross-session weakness trends.

## Tuning workflow

Numeric thresholds anywhere in the pose/form-engine stack (rep-counter
angles, form-rules bands, Form Engine issue bands) are only changed from
real gym-tested JSON debug exports — export a session via the dev HUD's
export buttons, compare the raw numbers against what actually happened on
camera, then adjust. Don't hand-tune a threshold from intuition alone; the
existing bands in `exercises.ts`/`form-rules.ts` were arrived at this way,
and the Form Engine's exercise profiles are explicitly first-pass/
conservative pending the same process (see `ALGORITHM.md` "Known
limitations").

## Known limitations

See `ALGORITHM.md` → "Form Analysis Engine" → "Known limitations" for the
full list (monocular-camera constraints, forward-lean vs. hyperextension
ambiguity, BlazePose-only heel/toe/rotation checks, first-pass thresholds,
device-local weakness tracking).

## Adding a new compensation rule to the Movement Intelligence Engine

`src/lib/pose/movement-engine/compensation.ts` holds a small `RULES` array —
each rule is a pair of Form Engine `IssueId`s that, when both active at once,
plausibly indicate one body region compensating for another. To add one:

1. Pick a `CompensationId` from `types.ts`'s union (or add a new one if the
   region genuinely isn't covered — same rule as adding an `IssueId`: check
   the existing union first).
2. Add a `CompensationRule` entry to `RULES`: two `IssueId`s (both must
   already exist in `form-engine/types.ts`'s `IssueId` union — this file
   never invents new Form Engine issues, only combines existing ones), a
   `region` label, and a `note` phrased as observed behavior ("X may be
   compensating for Y"), never a diagnosis.
3. That's it — `matchCompensations()` and the 8s per-rule cooldown in
   `engine.ts` handle detection/logging automatically; no other file needs
   touching.

## Adding a new trend dimension

`trend.ts`'s `classifyTrend(values, improvingIsHigher, threshold)` is
generic over any chronological number series — reuse it rather than writing
a new early/late comparison. To add a new tracked dimension:

1. If it's a `MovementScores` key, it's already covered — `engine.ts`'s
   `getSessionSummary()` loops `SCORE_KEYS` automatically.
2. For anything else (a new metric outside the 8 movement scores), call
   `classifyTrend()` directly with the right `threshold` for that value's
   unit — see `consistency.ts`'s `tempoDrift` for an example using a
   millisecond threshold instead of the default score-point one.

## Reading the MOVEMENT ENGINE HUD section

Visible alongside the FORM ENGINE section under the same Developer mode +
"Live debug HUD" gate. Shows the eight movement scores, dominant side,
current velocity, up to 3 recently-active compensation events (region +
confidence), and the current higher-level coaching message if one is
showing. Backed by `movementState` from `usePoseTrainer()`.

## Extending the Movement Engine debug export

Same additive-only rule as the Form Engine export. Both export paths
already carry `movementAnalysis` (`SessionResult.movementAnalysis` /
`AiLogChunk.movementAnalysis`, both `SessionMovementSummary` from
`movement-engine/types.ts`) — add new keys to that type and the JSON/CSV
exporters (`session-report.tsx`, `workout-session/summary.tsx`) the same
way the Form Engine's fields were added in Phase 4.

## Adding a new risk category to the Injury Risk Engine

`src/lib/pose/injury-risk-engine/risk-model.ts`'s `computeRiskFactors()`
builds one `RiskFactor` per category, and `combineRisk()`'s `WEIGHTS` table
combines them. To add a category:

1. Add it to `types.ts`'s `RiskCategory` union.
2. Add a `factor(id, score, note)` call in `computeRiskFactors()` — `score`
   must be a 0-100 number derived only from `RiskHistory`, `FormScores`,
   `MovementScores`, or the per-call scalar inputs (`secondsSinceLastRep`,
   `fatigueScore`) — **never** a raw pose landmark or a call into a sealed
   engine's internals. `note` must use movement-risk wording (see "Safety
   wording" below), never diagnostic phrasing.
3. Add a weight for it in `combineRisk()`'s `WEIGHTS` table — all weights
   must still sum to 1.0.
4. If it should be able to trigger a recommendation, add an entry to
   `recommendations.ts`'s `CATEGORY_ACTION` table.

If the new signal needs history it doesn't have yet, extend
`RiskHistory` (`history.ts`) — it already tracks rep intervals, rep scores,
peak velocity, and issue/compensation tallies; most new categories can
reuse one of those rather than adding a new buffer.

## Safety wording

Never write the word "injury," "injured," or any diagnostic phrasing
("you have," "you are suffering from") anywhere in
`risk-model.ts`/`recommendations.ts`. Use the established vocabulary:
"elevated movement risk," "fatigue accumulation," "technique
deterioration," "movement instability." This engine estimates coaching-
relevant movement risk from camera pose data — it has no clinical basis
for a diagnosis and must never imply one.

## Reading the INJURY RISK ENGINE HUD section

Visible alongside the FORM ENGINE and MOVEMENT ENGINE sections under the
same Developer mode + "Live debug HUD" gate. Shows overall risk level,
risk score, confidence, fatigue score, the current active-compensation
count, up to 3 top contributing reasons, and the current recommendation if
one is showing (cooldown-gated, so it won't appear every frame). Backed by
`riskState`, computed in `live-session.tsx` (not `usePoseTrainer()` — the
Injury Risk Engine is driven one level up; see `ALGORITHM.md` "Where it
runs" for why).

## Adding a new exercise to the Exercise Intelligence catalog

`src/lib/exercise-intelligence/exercise-catalog.ts` is the only file that
needs a new entry — every other file in the module is generic over
`ExerciseProfile`. To add one:

1. Add the new id to `types.ts`'s `ExerciseId` union.
2. Add a `defineExercise({...})` entry to `EXERCISE_CATALOG` in
   `exercise-catalog.ts`, built from the helpers already imported there:
   `rom()`, `tempo()`, `joints()`/`primary()`/`secondary()`/`stabilizer()`,
   `symmetry()`, `risk()`/`sensitivity()`, `mistake()`. Look at a similar
   existing exercise (e.g. another isolation lift for a new isolation
   exercise) and adapt its shape rather than starting from a blank object
   — the fields exist so a new profile reads consistently with the rest of
   the catalog, not so each one reinvents its own vocabulary.
3. List every alias this exercise is known by elsewhere in the app in the
   `aliases` array — the Prisma `Exercise.slug` (check
   `prisma/data/exercises.ts`) and the pose-layer `poseKey` (same file,
   often shared across several slugs, e.g. `"lunge"` covers `lunges` and
   `bulgarian-split-squat`). `defineExercise()` normalizes and dedupes
   these automatically, so list them as-is.
4. Don't invent biomechanics numbers from nothing — reuse the ROM/tempo
   ranges of the closest existing exercise in the catalog as a starting
   point (same "conservative first-pass, not guessed" rule as every other
   engine's thresholds — see `ALGORITHM.md` "Exercise Intelligence" →
   "Known limitations").
5. Run `npx tsc --noEmit` — `ExerciseProfile` is fully typed; a missing
   field fails to compile, and `ALL_EXERCISE_IDS`/`Record<ExerciseId, ...>`
   mean the catalog can't compile with a missing id either.

There is deliberately no generic/fallback profile for uncataloged
exercises (unlike `getExerciseConfig()`'s `"generic"` fallback) — a wrong
biomechanics claim is worse than no claim, so `supportsExercise()` simply
returns `false` until a real entry exists.

## Reading the EXERCISE INTELLIGENCE HUD section

Visible alongside the other engine sections under the same Developer mode
+ "Live debug HUD" gate, plus its own `forge:exerciseintelligence` toggle
in `/settings/developer` (on by default). Shows the movement pattern, ROM
range + primary joint, tempo envelope (eccentric/concentric seconds),
overall risk sensitivity, difficulty, and the top 3 common mistakes for
the exercise currently loaded. Backed by
`getExerciseIntelligenceSnapshot(exercise.poseKey ?? exercise.slug)`,
resolved once via `useMemo` when the exercise changes — not recomputed per
frame, since this is static metadata, not a per-frame pose reading. If the
section doesn't appear, the exercise's `slug`/`poseKey` isn't in the
catalog yet — see "Adding a new exercise" above.

## Running the AI Validation & Benchmark Framework

The full loop, start to finish:

1. **Get a labeled session.** Run a workout in `/train/[slug]` with dev
   mode + Live Debug HUD on, finish the session, and use the summary
   screen's debug export button — this downloads a
   `forge-debug-<slug>-<timestamp>.json` file. This *is* a
   `LabeledSession`; no separate export format exists for this framework.
2. **Create a dataset and add the session:**
   ```ts
   import { createDataset, addSession, saveDataset, loadSessionFromFile } from "@/lib/validation/dataset";

   const dataset = await createDataset("squat-baseline");
   addSession(dataset, await loadSessionFromFile("./forge-debug-squat-....json"));
   await saveDataset(dataset);
   ```
   There's no CLI script for this step (it's normally a few lines in a
   throwaway script or the Node REPL) — `validate`/`benchmark`/etc. all
   assume the dataset already exists.
3. **Label it with ground truth** — watch the recording, count the real
   reps, write a small JSON (or CSV) file:
   ```json
   [{ "sessionId": "<the session's meta.sessionId>", "trueRepCount": 9 }]
   ```
   Then: `npm run validation:validate squat-baseline ./ground-truth.json`
   — this imports the label(s) and attaches them to matching sessions in
   the dataset by `sessionId`.
4. **Benchmark it:** `npm run validation:benchmark squat-baseline` prints
   a per-exercise precision/recall/F1/latency summary to the console.
5. **Get full reports:** `npm run validation:evaluate squat-baseline`
   (JSON+Markdown) or `npm run validation:report squat-baseline` (all 4
   formats) — written under `.data/validation/reports/squat-baseline/`.
6. **Test a threshold candidate** — write
   `{ "label": "looser-depth", "config": { "requiredProgressOverride": 0.8 } }`
   to a file, then:
   `npm run validation:calibrate squat-baseline squat ./candidate.json`
   — replays every recorded rep decision through the real
   `buildValidation()` check with the candidate's required-progress
   fraction, prints original-vs-candidate metrics, and saves both a
   calibration version and an experiment record.
7. **Compare two saved reports:**
   `npm run validation:compare ./reportA.json ./reportB.json` — prints
   per-metric deltas and flags regressions.

See `/settings/developer/validation` for a live view of dataset coverage,
recent experiments, regression alerts, and the latest report — it only
*displays* what the CLI has already produced; it never triggers a run.

## Adding a new metric to the Benchmark Engine

`src/lib/validation/benchmark/` has one file per concern
(`rep-accuracy.ts`, `form-issue-accuracy.ts`, `latency.ts`), each
returning a piece of `BenchmarkResult`. To add a new one:

1. Add the new field to `BenchmarkResult` in `benchmark/types.ts`.
2. Write a pure function `benchmarkX(session, groundTruth): X | null` in
   its own file — reuse `metrics/computeClassificationMetrics()` or
   `statistics/` rather than hand-rolling precision/recall/percentiles
   again.
3. Call it from `benchmark/engine.ts`'s `runBenchmark()`.
4. If it should roll up per-exercise, add the aggregation to
   `evaluation/engine.ts` and the corresponding field to
   `ExerciseBenchmarkReport` — reuse `evaluation/aggregate.ts`'s
   `macroAverageClassification()` if it's a classification metric.
5. Add a column to `reports/markdown.ts`/`csv.ts`/`html.ts` if it should
   show up in generated reports, and a row to the Developer dashboard
   (`/settings/developer/validation`) if it should be visible without
   opening a report file.

## Known limitation: no live-pipeline replay

This framework cannot re-run a recorded video through the actual
MoveNet/BlazePose pipeline — that pipeline is browser-only (canvas/video
element + `@tensorflow/tfjs`), and no Node-compatible inference path
(`tfjs-node`, video decoding) is installed. Everything here scores the
debug export a session already produced, plus (in `threshold-testing/`)
replays the one pure, Node-callable decision function
(`state-machine.ts`'s `buildValidation()`). See `ALGORITHM.md` → "AI
Validation & Benchmark Framework" → "Known limitations" for the full list.

## Running the AI Training & Continuous Improvement Platform

Builds directly on the loop above — you need a labeled Phase 12 dataset
before any of this is useful. The typical release cycle:

1. **Import sessions and label them** (see "Running the AI Validation &
   Benchmark Framework" above), or use the new, more direct path:
   ```
   npm run dataset:import my-release-set ./forge-debug-squat-....json
   ```
   which creates the dataset (if new) and adds the session in one step —
   fills the gap Phase 12 originally left as "a few lines in a throwaway
   script."
2. **Check dataset coverage before trusting it**:
   `npm run dataset:validate my-release-set` — prints exercise/camera-
   angle/device/lighting/difficulty distribution and a composite quality
   score (0-100%, weighted: 50% labeled fraction, 50% coverage breadth).
3. **Promote a trusted dataset version to golden**, once, from code (no
   CLI wrapper yet — it's a rare, deliberate action):
   ```ts
   import { promoteToGolden } from "@/lib/mlops/golden-datasets";
   await promoteToGolden("my-release-set", 1, { promotedBy: "you" });
   ```
4. **Create a release candidate**, which evaluates the dataset, checks
   drift against a baseline (optional), detects regressions against the
   previous release / golden dataset / latest production (whichever
   exist), and runs all six release gates:
   ```
   npm run release:create "v1.2.0" my-release-set --golden=my-release-set@1
   ```
   Add `--baseline=older-set@1` to also get a drift report against an
   older dataset. Prints PASS/FAIL per gate and the release id.
5. **Approve or reject**:
   `npm run release:approve <releaseId>` (fails if any gate failed —
   pass `--force` to override, `--reject --reason="..."` to reject
   instead).
6. **Compare two releases directly**:
   `npm run release:compare <releaseIdA> <releaseIdB>`.
7. **Check for data drift on its own**, independent of a release:
   `npm run drift:check baseline-set@1 current-set@2`.
8. **Check quality scores across everything**: `npm run quality:report`.

### Human review and feedback

- A user or developer reports a problem via `POST /api/feedback`
  (`sessionId`, `exerciseSlug`, `type`, `description`) — no UI calls this
  yet, but the route works today.
- `npm run feedback:sync` routes any session-linked feedback into the
  human-review queue.
- A reviewer resolves a queue item in code:
  ```ts
  import { submitReview } from "@/lib/mlops/human-review";
  await submitReview(reviewItemId, {
    status: "corrected",
    reviewer: "you",
    correctedLabel: { trueRepCount: 11 },
  });
  ```
  This writes a real `GroundTruthLabel` back into Phase 12's ground-truth
  store immediately — the next `validation:benchmark`/`release:create`
  run picks it up automatically.
- To find out *which* unlabeled sessions are worth reviewing next:
  ```ts
  import { loadDataset } from "@/lib/validation/dataset";
  import { prioritizeForLabeling } from "@/lib/mlops/active-learning";
  const dataset = await loadDataset("my-release-set");
  console.log(prioritizeForLabeling(dataset));
  ```

See `/settings/developer/mlops` for a live view of dataset coverage,
golden datasets, release candidates, quality scores, regression alerts,
and drift alerts — it only *displays* what the CLI has already produced,
same as the Validation dashboard.

## Adding a new mlops module

Every module under `src/lib/mlops/` follows the same shape as
`src/lib/validation/`: a `types.ts`, one or more implementation files, an
`index.ts` barrel — and, like `validation/`, **no `"server-only"` import**
anywhere, since this tree runs from both Next.js API routes and plain-
Node CLI scripts (`scripts/mlops/*.ts`, via `tsx`). Persistence is
file-based under `.data/mlops/<module-name>/`, following whichever of the
two established patterns fits: a single JSON file for a small registry
(`model-registry/current.json`), or one file per record for a growing
collection (`release-manager/`'s `.data/mlops/releases/<id>.json`). When
in doubt, look at the most similar existing module and match its shape
rather than inventing a third pattern.

## Running the AI Observability & Experimentation Platform

**Analytics/retention/cohorts/heatmaps need nothing set up** — they read
directly from Prisma, so `npm run observability:status` works against
whatever real workout data already exists in the database.

**Distributed tracing** is already wired into
`POST /api/sessions`/`POST /api/workout-logs` — every real session save
produces a trace under `.data/observability/traces/`, inspectable via:
```ts
import { getSessionDebugView } from "@/lib/observability/sessions";
console.log(await getSessionDebugView(workoutSessionId));
```

**Running a live A/B experiment**, end to end:

1. `npm run experiments:create checkout-copy "Checkout copy test" completionRate control:50 treatment:50`
2. In the code path you're testing, assign and record in one call:
   ```ts
   import { assignAndRecord } from "@/lib/observability/experiments";
   const variant = await assignAndRecord(experimentId, userId, metricValue);
   // branch on `variant` to actually show the control/treatment behavior
   ```
3. Once both variants have ≥30 recorded outcomes:
   `npm run experiments:compare <experimentId>` — prints per-variant
   mean/stddev, the winner (or "not enough data" if either variant is
   still under 30), and the practical impact (delta per 1000 users) if
   your variants are literally named `control`/`treatment`.

**Starting a canary rollout that actually reaches live traffic** — the
CLI (`rollout:start`/`rollout:stop`) runs as its own process and *cannot*
change an already-running server's feature flags (see ALGORITHM.md
"Known limitations" for why). To affect real traffic, call the API route
instead, from anywhere already running inside the server process (or via
an authenticated request to it):
```
POST /api/observability/rollouts
{ "action": "start", "flagKey": "new-rep-ui", "stages": [10, 25, 50, 100] }
```
Then `{ "action": "advance", "rolloutId": "..." }` to bump to the next
stage, or `{ "action": "rollback", "rolloutId": "..." }` to zero it out.
The CLI is still useful for local testing/scripting — just not for
pushing a change to a server you're not currently running.

**Alerting**: `npm run alerts:test` both fires one synthetic alert (to
confirm the recording pipeline works) and runs every real alert
condition against current state — a reasonable thing to run on a
schedule once this app has one (see the job-scheduler roadmap item).

See `/settings/developer/observability` for a live view of health,
experiments, rollouts, latency, cost, alerts, errors, retention, and
feature usage — same "displays, never triggers a run" pattern as the
other three Developer dashboards, except for its two write paths
(`POST /api/observability/errors`, already wired into the app's error
boundaries; `POST /api/observability/rollouts`, described above).

## Known limitation: `"server-only"` isn't a real package

If you add a new module anywhere under `src/lib/` that needs to run from
both a Next.js route/page **and** a plain-Node script (a CLI script, a
seed script, a one-off `tsx` invocation), do not add
`import "server-only";` to it. That package is not installed in this
project (confirm with `ls node_modules/server-only` — it doesn't exist);
Next.js's bundler has special built-in handling for the bare specifier
that only kicks in inside its own build, so `tsc`/`next build` stay
silent about the missing module while plain `tsx`/`node` fail immediately
with `Cannot find module 'server-only'`. This bit both Phase 12/13
(`validation/`, `mlops/`) and, on discovering it needed to import
`src/lib/platform/` for the first time, Phase 14 — which is why
`"server-only"` was removed from all 46 files under `src/lib/platform/`
(Phase 11) as part of this phase. `src/lib/platform/` and everything
under `src/lib/validation/`, `src/lib/mlops/`, and
`src/lib/observability/` are now all CLI-safe; keep new modules in that
family the same way.

## Running the Playwright E2E suite

`npm run test:e2e` runs the 5 specs under `tests/e2e/` (auth,
onboarding, workout session, account deletion) against a **production
build** (`playwright.config.ts`'s `webServer` runs
`npm run build && npm run start` locally, or just `npm run start` in CI
since `ci.yml` already built beforehand) — not `next dev`, since
Turbopack's lazy per-route compilation made a cold dev server flaky
against per-test timeouts. Each spec creates a throwaway account
(`tests/e2e/helpers.ts`'s `uniqueEmail()`) and cleans it up in
`afterAll`, since no dedicated test database exists yet — they run
safely against the real dev database. Two things worth knowing before
touching this suite:

- **Test-mode camera skip**: `src/lib/pose/test-mode.ts`'s
  `isE2ETestMode()` is gated on `NEXT_PUBLIC_E2E_TEST=1` (set only by
  Playwright's `webServer` env, never true in real dev/production).
  When active, `trainer-experience.tsx`'s "Continue to camera setup"
  button skips straight to a canned `SessionResult` instead of the real
  camera/pose-detection phase — there's no camera in a headless CI
  browser. The canned result still flows through the real
  `/api/sessions` save, so the spec genuinely exercises that path.
- **Cold-start timing**: the first hit to a fresh server/DB connection
  (Neon, in particular) can be slow — several specs wait on the actual
  network response (`page.waitForResponse`) rather than just a UI
  element, specifically to avoid racing ahead of a slow-but-successful
  request. If you add a new spec that submits a form and then checks a
  DB side effect, wait for the response first.
- `src/lib/prisma.ts` auto-appends `pgbouncer=true` to the datasource
  URL when it detects a Neon `-pooler` endpoint — this was found and
  fixed while chasing what first looked like E2E flakiness but was a
  real (if rare) production issue with rapid successive writes-then-reads
  against a pooled connection. See `CHANGELOG.md` Phase 24 for the full
  story if you ever see a spurious "record not found" error that
  shouldn't be possible.

## Deploying to Render

See `docs/DEPLOYMENT.md` for the full checklist (env vars, persistent
disk, first-deploy steps) and `docs/RELEASE_CHECKLIST.md` before
actually inviting real users. The short version: `output: "standalone"`
in `next.config.ts` + the automatic `postbuild` step
(`scripts/copy-standalone-assets.ts`) mean Render's Build Command is
just `npm run build` and Start Command is
`node .next/standalone/server.js` — no Dockerfile needed, since this
project only uses the pure-JS/WASM `@tensorflow/tfjs`, never
`@tensorflow/tfjs-node`. Test the exact deployed artifact locally with
`npm run build && npm run start:standalone`.
