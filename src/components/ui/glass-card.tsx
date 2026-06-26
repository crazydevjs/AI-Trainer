"use client";

import * as React from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

interface GlassCardProps extends HTMLMotionProps<"div"> {
  strong?: boolean;
  glow?: "none" | "ember" | "volt";
}

/** Frosted glass panel with optional entrance animation and neon glow. */
export function GlassCard({
  className,
  strong,
  glow = "none",
  ...props
}: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "rounded-3xl p-6",
        strong ? "glass-strong" : "glass",
        glow === "ember" && "glow-ember",
        glow === "volt" && "glow-volt",
        className
      )}
      {...props}
    />
  );
}
