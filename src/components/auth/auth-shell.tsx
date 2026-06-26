"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Logo } from "@/components/brand";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main className="relative flex min-h-screen flex-1 items-center justify-center px-4 py-12">
      {/* ambient orbs */}
      <div className="pointer-events-none absolute left-1/4 top-1/4 h-72 w-72 animate-float rounded-full bg-ember/20 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-1/4 right-1/4 h-72 w-72 animate-float rounded-full bg-volt/15 blur-[120px] [animation-delay:2s]" />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="glass-strong relative z-10 w-full max-w-md rounded-3xl p-8"
      >
        <Link href="/" className="mb-8 flex justify-center">
          <Logo />
        </Link>

        <h1 className="font-display text-center text-3xl font-bold uppercase tracking-wide">
          {title}
        </h1>
        <p className="mt-2 text-center text-sm text-fog">{subtitle}</p>

        <div className="mt-8">{children}</div>

        {footer && (
          <div className="mt-6 text-center text-sm text-fog">{footer}</div>
        )}
      </motion.div>
    </main>
  );
}
