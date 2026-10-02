"use client";

import { useTweenedNumber } from "@/hooks/useTweenedNumber";

interface ProgressBarProps {
  /** 0..1, or undefined for an indeterminate bar. */
  value?: number;
  size?: "sm" | "md";
  className?: string;
}

/** Gradient progress bar with eased motion, a glowing tip and a moving sheen. */
export function ProgressBar({ value, size = "sm", className = "" }: ProgressBarProps) {
  const indeterminate = value === undefined;
  const tweened = useTweenedNumber(Math.min(1, Math.max(0, value ?? 0)));
  const percent = tweened * 100;

  return (
    <div
      className={`relative w-full overflow-hidden rounded-full bg-surface-3 ${size === "md" ? "h-2" : "h-1.5"} ${className}`}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={indeterminate ? undefined : Math.round(percent)}
    >
      {indeterminate ? (
        <div className="absolute inset-y-0 w-2/5 animate-indeterminate rounded-full bg-gradient-to-r from-transparent via-primary to-transparent" />
      ) : (
        <div
          className="relative h-full overflow-hidden rounded-full bg-gradient-to-r from-primary/70 to-primary shadow-[0_0_10px_var(--primary-ring)]"
          style={{ width: `${percent}%` }}
        >
          {percent < 100 && (
            <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/45 to-transparent" />
          )}
        </div>
      )}
    </div>
  );
}
