# Deployment (Render)

FORGE deploys as a native Node web service — no Docker needed. The only
runtime dependency requiring native bindings would be `@tensorflow/tfjs-node`,
and this project doesn't use it (only the pure-JS/WASM `@tensorflow/tfjs`,
used client-side only), so a plain Node buildpack is sufficient.

## 1. Create the Render Web Service

- **Repo**: connect this GitHub repo.
- **Runtime**: Node (`package.json`'s `engines.node` pins `>=20 <23`).
- **Build Command**: `npm run build`
  (this also runs `postbuild` automatically, which copies `public/` and
  `.next/static/` into `.next/standalone/` — required for
  `output: "standalone"` to serve correctly; see `next.config.ts`).
- **Start Command**: `node .next/standalone/server.js`
- **Health Check Path**: `/api/health` (already checks the DB and cache;
  returns a non-200 status if either is down — see
  `src/lib/platform/monitoring/health.ts`).

## 2. Environment variables

Copy every value from `.env.example` into Render's Environment tab.
Required vs. optional:

| Variable | Required? | Notes |
|---|---|---|
| `DATABASE_URL` | **Required** | Neon pooled connection string. `src/lib/prisma.ts` auto-appends `pgbouncer=true` for `-pooler` endpoints — no action needed. |
| `NEXT_PUBLIC_APP_URL` | **Required** | Set to the real `https://your-app.onrender.com` URL (or custom domain) — used in emails, OAuth redirect, Stripe checkout return URLs. |
| `JWT_SECRET` | **Required** | `openssl rand -base64 48`. The app fails to boot without this in production (Phase 15 — no insecure fallback outside local dev). |
| `SIGNING_SECRET` | **Required** | Same requirement as `JWT_SECRET`, used for signed storage URLs. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Optional | Google sign-in is disabled (button hidden/errors) if unset. If used, add `https://your-app.onrender.com/api/auth/google/callback` as an authorized redirect URI in Google Cloud Console. |
| `SMTP_HOST` / `PORT` / `USER` / `PASS` / `FROM` | Optional but **strongly recommended for production** | Without SMTP, verification/reset links are only printed to the server log — real users can't self-serve email verification or password reset without server log access. |
| `STRIPE_SECRET_KEY` / `STRIPE_PUBLISHABLE_KEY` / `STRIPE_WEBHOOK_SECRET` / `STRIPE_PRICE_PRO` / `STRIPE_PRICE_ELITE` | Optional | Test-mode only for the v1 Beta (see Phase 21). Without these, billing falls back to the in-memory mock provider automatically — fine for the beta, since everyone gets full access regardless of plan. |
| `NEXT_PUBLIC_CDN_URL` | Optional | Only relevant if a CDN is later put in front of the storage provider. |
| `FEATURE_FLAGS_JSON` | Optional | Seeds extra flags at boot; unset is fine. |
| `LOG_LEVEL` | Optional | Defaults to `info`. |
| `OPENAI_API_KEY` | Not used | `src/lib/coach.ts` is fully local/offline — this var is currently dead, documented for whenever a real LLM is wired in. |

## 3. Persistent disk

Attach a small Render persistent disk mounted at `.data/` in the service
settings. This is the **only** subsystem under `.data/` that needs to
survive a redeploy for the beta:

| Path | Survives redeploy? | Why |
|---|---|---|
| `.data/observability/error-groups/` | **Yes — attach the disk for this** | Crash-report history (Phase 25). You want this intact right after a bad deploy, not wiped. |
| `.data/mlops/`, `.data/validation/` | No, and that's fine | Internal ML-ops/validation tooling for the maintainer only — re-derivable from source data, not user-facing. |
| `.data/observability/{rollouts,experiments,alerts,trace,cost}/` | No, and that's fine | A reset rollout just means re-running `rollout:start`; none of this is user-facing state. |
| `.data/storage/` | No, and that's fine (for now) | Zero write call sites anywhere in the app today — if a future feature (avatar upload, video export) starts writing here, revisit this table before shipping it. |

Without the disk, everything above resets to empty on every deploy — for
a beta with infrequent deploys, only the crash-report gap is worth
paying for.

## 4. After the first deploy

1. **Run the seed script once** against the production database (from a
   local shell with `DATABASE_URL` pointed at prod, or a Render one-off
   job): `npm run db:seed` — populates the exercise library.
2. **Promote your own account to admin** (no UI for this yet — direct
   DB update): `UPDATE "User" SET role = 'ADMIN' WHERE email = '...';`
3. **Register the Stripe webhook** (if using real test-mode Stripe): in
   the Stripe Dashboard, add an endpoint pointed at
   `https://your-app.onrender.com/api/billing/webhook`, subscribed to
   `checkout.session.completed`, `customer.subscription.updated`, and
   `customer.subscription.deleted`. Copy the resulting signing secret into
   `STRIPE_WEBHOOK_SECRET` and redeploy.
4. **Confirm the health check is green** and the admin dashboard
   (`/admin`, as your promoted account) shows real data.
5. Run the Playwright suite against the deployed URL once, to catch
   anything environment-specific that local testing didn't:
   `PLAYWRIGHT_BASE_URL=https://your-app.onrender.com npx playwright test`
   (this points the suite at the deployed app instead of starting a
   local server — see `playwright.config.ts`).

## 5. Rollback

Use Render's built-in "rollback to previous deploy" feature (available
on the dashboard's Deploys tab) if a release causes problems. No
database migration rollback is needed for schema changes, since this
project uses `prisma db push` (schema-sync) rather than versioned
migrations — see `CHANGELOG.md` Phase 15 for why.
