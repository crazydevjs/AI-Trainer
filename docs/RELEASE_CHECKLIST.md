# Release Checklist — AI Trainer v1 Beta

Run through this before inviting real users. Check items off in order —
several depend on the ones before them.

## Code quality

- [ ] `npm run typecheck` — zero errors
- [ ] `npx eslint .` — zero problems (baseline was 51 before Phase 17;
      should be 0 now — if this list ever shows a nonzero count, treat
      it as a regression, not "the old baseline")
- [ ] `npm run build` — succeeds, `postbuild` runs automatically
- [ ] `npx playwright test` — all 5 specs pass locally against a real
      (throwaway-account) run

## Database

- [ ] `DATABASE_URL` (production) confirmed pointed at the real Neon
      project, not a dev/test branch
- [ ] `npx prisma db push` run against production at least once (this
      project uses schema-sync, not versioned migrations — see
      `CHANGELOG.md` Phase 15)
- [ ] `npm run db:seed` run against production — exercise library
      populated
- [ ] At least one account promoted to `role: 'ADMIN'` directly in the
      DB (no UI for this yet)

## Environment variables (Render dashboard)

See `docs/DEPLOYMENT.md` §2 for the full table. Minimum for a working
beta:

- [ ] `DATABASE_URL`
- [ ] `NEXT_PUBLIC_APP_URL` — the real deployed URL, not localhost
- [ ] `JWT_SECRET` and `SIGNING_SECRET` — real random values (the app
      fails to boot without these in production, by design)
- [ ] `SMTP_*` — set for real, or explicitly accept that verification/
      reset links only reach the server log (not viable for real users
      who aren't you)
- [ ] `GOOGLE_CLIENT_ID`/`SECRET` — set if Google sign-in should work,
      with the production callback URL added in Google Cloud Console
- [ ] Stripe vars — only if doing real test-mode checkout rehearsals;
      otherwise leave unset and accept the mock billing provider

## Render service

- [ ] Web service created, Build Command `npm run build`, Start Command
      `node .next/standalone/server.js`, health check path `/api/health`
- [ ] Persistent disk attached at `.data/` (covers crash-report history —
      see `docs/DEPLOYMENT.md` §3 for why only this one subsystem needs it)
- [ ] Health check shows green in the Render dashboard
- [ ] `engines.node` (`>=20 <23`) respected by the selected runtime

## Post-deploy smoke test (against the real deployed URL)

- [ ] Sign up, verify email (real inbox if SMTP is live, else server
      log), log in
- [ ] Complete onboarding, land on dashboard
- [ ] Start and log a real workout session (real camera this time, not
      test mode) — rep counting, form cues, rest screen, summary all work
- [ ] `/admin` shows real data as your promoted admin account; a
      non-admin account is blocked
- [ ] `/settings` → change password → confirm old session revoked,
      new one works
- [ ] `/settings` → delete a throwaway test account → confirm it's
      actually gone (`prisma studio` or a direct query)
- [ ] If Stripe is live: complete a real test-mode checkout, confirm the
      `Subscription` row updates and the billing page reflects it
- [ ] Throw a deliberate client-side error (e.g. via browser devtools
      console) and confirm it shows up in `/admin`'s error list
      (proves `CrashReporter` → `/api/observability/errors` → dashboard
      is wired end-to-end in the real deployed environment, not just
      locally)
- [ ] (Optional but recommended) Run the Playwright suite against the
      deployed URL: `PLAYWRIGHT_BASE_URL=https://your-app.onrender.com
      npx playwright test`

## Monitoring & rollback

- [ ] Confirm you know where to check platform health going forward:
      `/admin` (business-level) and `/settings/developer/*` (engine-
      internals, admin-only in production as of Phase 16)
- [ ] Confirm Render's "rollback to previous deploy" is available on
      your plan tier, and you know where it is in the dashboard
- [ ] Confirm CI (`.github/workflows/ci.yml`) has real
      `DATABASE_URL_TEST`/`JWT_SECRET_TEST`/`SIGNING_SECRET_TEST` secrets
      configured, pointed at a dedicated test database, and has gone
      green on at least one real PR

## Known, deliberately-accepted gaps for v1 Beta

Not blockers — listed here so they're a decision, not an oversight:

- No real payment processing (Stripe test-mode only, or fully mocked) —
  everyone gets full access during the beta by design.
- `.data/mlops/`, `.data/validation/`, and most of `.data/observability/`
  reset on every deploy (only `error-groups/` is covered by the
  persistent disk) — acceptable, none of it is user-facing.
- No API-route try/catch sweep was done (Phase 18) — unhandled
  exceptions in read-only GET routes fall back to a generic client-side
  network-error message, which is acceptable, not silent failure.
- CI has not been run for real yet (needs secrets — see above).
- The app has not been deployed to a real Render service yet in this
  session (no account access) — every step above the "Render service"
  section has been verified locally; the Render-specific steps are
  yours to execute.
