"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        "h-12 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-sm text-chalk",
        "placeholder:text-smoke outline-none transition-all duration-200",
        "focus:border-ember/50 focus:bg-white/[0.05] focus:ring-2 focus:ring-ember/20",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

export { Input };
