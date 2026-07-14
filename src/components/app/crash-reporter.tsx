"use client";

import { useEffect } from "react";

/**
 * `error.tsx`/`global-error.tsx` (Phase 14) only catch errors thrown
 * during React's render — an error thrown inside an async callback,
 * event handler, or a rejected Promise with no `.catch` never trips a
 * React error boundary and was previously invisible to
 * `POST /api/observability/errors`. Mounted once in the root layout so
 * it's active on every page, logged-in or not.
 */
export function CrashReporter() {
  useEffect(() => {
    function report(message: string, stack?: string) {
      fetch("/api/observability/errors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, stack }),
      }).catch(() => {
        // Reporting the error must never itself throw or block the UI.
      });
    }

    function onError(event: ErrorEvent) {
      report(event.message || "Unknown error", event.error?.stack);
    }

    function onUnhandledRejection(event: PromiseRejectionEvent) {
      const reason = event.reason;
      const message =
        reason instanceof Error ? reason.message : String(reason ?? "Unhandled promise rejection");
      report(message, reason instanceof Error ? reason.stack : undefined);
    }

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  return null;
}
