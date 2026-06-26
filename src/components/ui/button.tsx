"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-semibold tracking-wide transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/60 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] select-none",
  {
    variants: {
      variant: {
        primary:
          "text-white bg-gradient-to-br from-ember to-flame shadow-[0_10px_30px_-10px_rgba(255,59,48,0.7)] hover:shadow-[0_14px_40px_-10px_rgba(255,59,48,0.9)] hover:brightness-110",
        volt: "text-void bg-gradient-to-br from-volt to-neon shadow-[0_10px_30px_-10px_rgba(43,212,255,0.6)] hover:brightness-110",
        outline:
          "border border-white/15 bg-white/[0.03] text-chalk hover:bg-white/[0.07] hover:border-white/25",
        ghost: "text-fog hover:text-chalk hover:bg-white/[0.05]",
        glass:
          "glass text-chalk hover:bg-white/[0.06] hover:-translate-y-0.5",
        danger:
          "text-white bg-gradient-to-br from-ember to-red-700 shadow-[0_10px_30px_-10px_rgba(255,59,48,0.7)] hover:brightness-110",
      },
      size: {
        sm: "h-9 px-4 text-xs",
        md: "h-11 px-6",
        lg: "h-13 px-8 text-base",
        xl: "h-14 px-10 text-base",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Render as the child element (e.g. a Next.js <Link>) instead of <button>. */
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
