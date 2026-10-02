"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Smoothly animates toward `target` (ease-out cubic) so progress values that
 * arrive in coarse jumps still render as fluid motion. Pass `initial` (e.g. 0)
 * to count up on mount.
 */
export function useTweenedNumber(target: number, duration = 380, initial = target): number {
  const [value, setValue] = useState(initial);
  const current = useRef(initial);

  useEffect(() => {
    const from = current.current;
    if (from === target) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = performance.now();
    let frame = 0;

    const step = (now: number) => {
      const t = reduceMotion ? 1 : Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      current.current = from + (target - from) * eased;
      setValue(current.current);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}
