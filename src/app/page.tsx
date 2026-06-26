"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Activity,
  Camera,
  Dumbbell,
  LineChart,
  Sparkles,
  Trophy,
} from "lucide-react";
import { Logo } from "@/components/brand";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Camera,
    title: "AI Camera Coach",
    desc: "Your webcam becomes a personal trainer — real-time form correction and voice cues.",
    accent: "text-ember",
  },
  {
    icon: Activity,
    title: "Auto Rep Counting",
    desc: "Pose detection counts every rep and measures range of motion automatically.",
    accent: "text-volt",
  },
  {
    icon: LineChart,
    title: "Progress Intelligence",
    desc: "Track strength, weight, and PRs with cinematic charts and weekly reports.",
    accent: "text-neon",
  },
  {
    icon: Dumbbell,
    title: "Personalized Plans",
    desc: "Programs tuned to your goals, equipment, experience, and schedule.",
    accent: "text-flame",
  },
  {
    icon: Trophy,
    title: "Gamified Streaks",
    desc: "Earn XP, level up, and unlock achievements as you stay consistent.",
    accent: "text-amber",
  },
  {
    icon: Sparkles,
    title: "Session Scoring",
    desc: "Get a form, tempo, and range-of-motion score out of 10 after every workout.",
    accent: "text-ember",
  },
];

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.08, ease: EASE },
  }),
};

export default function LandingPage() {
  return (
    <main className="relative flex-1 overflow-hidden">
      {/* Nav */}
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <Logo />
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Log in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/signup">Get started</Link>
          </Button>
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-6 pb-24 pt-12 text-center sm:pt-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 text-xs font-medium uppercase tracking-widest text-fog"
        >
          <span className="h-1.5 w-1.5 animate-pulse-glow rounded-full bg-ember" />
          AI-Powered Personal Training
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="font-display mx-auto max-w-4xl text-5xl font-bold uppercase leading-[0.95] tracking-tight sm:text-7xl"
        >
          Forge the body
          <br />
          <span className="text-gradient text-glow">you train for.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto mt-6 max-w-xl text-lg text-fog"
        >
          An AI coach that watches your form, counts your reps, and corrects you
          in real time — like having a personal trainer inside your camera.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <Button asChild size="xl" className="w-full sm:w-auto">
            <Link href="/signup">Start training free</Link>
          </Button>
          <Button asChild variant="glass" size="xl" className="w-full sm:w-auto">
            <Link href="/login">I have an account</Link>
          </Button>
        </motion.div>

        {/* Hero stat strip */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="glass-strong mx-auto mt-16 grid max-w-3xl grid-cols-3 gap-4 rounded-3xl p-6"
        >
          {[
            ["11+", "Tracked exercises"],
            ["Real-time", "Form feedback"],
            ["10/10", "Session scoring"],
          ].map(([big, small]) => (
            <div key={small} className="text-center">
              <div className="font-display text-3xl font-bold text-chalk sm:text-4xl">
                {big}
              </div>
              <div className="mt-1 text-xs uppercase tracking-widest text-smoke">
                {small}
              </div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-6 pb-32">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              custom={i}
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-80px" }}
              className="glass group rounded-3xl p-6 transition-transform duration-300 hover:-translate-y-1"
            >
              <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-white/[0.04] ring-1 ring-white/10">
                <f.icon className={`h-6 w-6 ${f.accent}`} />
              </div>
              <h3 className="font-display text-lg font-semibold tracking-wide">
                {f.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-fog">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 text-sm text-smoke sm:flex-row">
          <Logo />
          <p>© {new Date().getFullYear()} FORGE. Train smarter.</p>
        </div>
      </footer>
    </main>
  );
}
