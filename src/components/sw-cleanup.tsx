"use client";

import { useEffect } from "react";

/**
 * This app does not use a service worker. A leftover SW from a previous project
 * on the same localhost origin can intercept requests and serve STALE cached
 * JavaScript, causing hydration mismatches. This unregisters any such SW and
 * clears its caches so the browser always loads fresh app code.
 */
export function ServiceWorkerCleanup() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }
    navigator.serviceWorker
      .getRegistrations()
      .then((regs) => {
        if (regs.length === 0) return;
        regs.forEach((r) => r.unregister());
        if (typeof caches !== "undefined") {
          caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
        }
        // One reload to pick up real, un-cached assets.
        window.location.reload();
      })
      .catch(() => {});
  }, []);

  return null;
}
