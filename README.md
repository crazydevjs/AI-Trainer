# 🔥 FORGE — AI Fitness Trainer

A premium, AI-powered fitness trainer web app with a dark luxury gym aesthetic.
Real-time form correction, automatic rep counting, personalized plans, and a
cinematic command-center dashboard.

> **Status:** Milestone 1 shipped — Foundation, Authentication & Onboarding.
> The AI Camera Trainer, live sessions, progress analytics, and gamification are
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

---

## Quick Start

```bash
# 1. Install deps (already done if scaffolded)
npm install

# 2. Configure environment
cp .env.example .env
#   → set DATABASE_URL to a Postgres instance (Neon / Supabase / local)
#   → JWT_SECRET is auto-generated; set Google + SMTP keys when ready

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
| `npm run build`     | Production build                     |
| `npm run typecheck` | `tsc --noEmit`                       |
| `npm run db:push`   | Sync schema to DB (no migration)     |
| `npm run db:migrate`| Create a migration                   |
| `npm run db:seed`   | Seed exercises + achievements        |
| `npm run db:studio` | Prisma Studio GUI                    |

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
| POST   | `/api/auth/login`              | Credentials login                     |
| POST   | `/api/auth/logout`             | Clear session                         |
| GET    | `/api/auth/me`                 | Current user (401 if anon)            |
| GET    | `/api/auth/verify?token=`      | Confirm email                         |
| POST   | `/api/auth/forgot-password`    | Send reset link                       |
| POST   | `/api/auth/reset-password`     | Set new password                      |
| GET    | `/api/auth/google`             | Start Google OAuth                    |
| GET    | `/api/auth/google/callback`    | OAuth callback → session              |
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
- Sessions are **HTTP-only JWT cookies** (7-day expiry, jose HS256).
- Passwords hashed with **bcrypt** (cost 12). Reset/verify tokens are single-use.

---

## Roadmap

1. ✅ **Foundation · Auth · Onboarding**
2. ✅ **Exercise Database & Workout Creator** — 120 exercises, equipment catalog,
   filters/AI badges, custom workouts + program templates.
3. ✅ **AI Camera Trainer** — full-screen MoveNet pose detection, automatic rep
   counting, range-of-motion + posture scoring, real-time voice coaching, rest
   timers, and a post-session report (score /10, form/tempo/ROM, calories, XP).
   Routes: `/train/[slug]` (immersive, no chrome) + `POST /api/sessions`.
4. **Progress analytics** — weight & strength graphs, PRs, monthly reports.
4. **Progress analytics** — weight & strength graphs, PRs, monthly reports.
5. **Gamification** — XP, levels, streaks, badges, achievements.
6. **Notifications** — workout/water reminders, motivation, recovery alerts.
7. **Admin panel** — user/exercise management, AI reports, platform analytics.

---

## Verification status

- `npm run typecheck` — ✅ passes
- `npm run build` — ✅ all 22 routes compile
- Runtime smoke test — ✅ public pages 200, protected routes 307→`/login`,
  `/api/auth/me` 401, input validation 400. Full DB flow requires `DATABASE_URL`.
