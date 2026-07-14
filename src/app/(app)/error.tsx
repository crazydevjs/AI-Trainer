"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App route error:", error);
    fetch("/api/observability/errors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: error.message, stack: error.stack }),
    }).catch(() => {
      // Reporting the error must never itself throw or block the UI.
    });
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-ember/15 ring-1 ring-ember/30">
        <AlertTriangle className="h-8 w-8 text-ember" />
      </div>
      <h1 className="font-display text-2xl font-bold uppercase tracking-wide">
        Something broke
      </h1>
      <p className="mt-2 max-w-md text-sm text-fog">
        We hit an error loading this page. This is usually a temporary database
        hiccup — try again.
      </p>
      <Button className="mt-6" onClick={() => reset()}>
        <RotateCw className="h-4 w-4" />
        Retry
      </Button>
      {error.digest && (
        <p className="mt-4 text-xs text-smoke">Ref: {error.digest}</p>
      )}
    </div>
  );
}
