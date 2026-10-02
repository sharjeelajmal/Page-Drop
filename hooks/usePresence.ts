"use client";

import { useEffect, useState } from "react";

/**
 * Keeps an element mounted for `exitMs` after `open` turns false so it can
 * play an exit animation. `closing` is true during that window.
 */
export function usePresence(open: boolean, exitMs = 220) {
  const [mounted, setMounted] = useState(open);

  // Derived-state update during render: mount immediately when opened.
  if (open && !mounted) setMounted(true);

  useEffect(() => {
    if (open || !mounted) return;
    const timer = window.setTimeout(() => setMounted(false), exitMs);
    return () => window.clearTimeout(timer);
  }, [open, mounted, exitMs]);

  return { mounted, closing: mounted && !open };
}
