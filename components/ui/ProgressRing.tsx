"use client";

import { useTweenedNumber } from "@/hooks/useTweenedNumber";

interface ProgressRingProps {
  /** 0..1 */
  value: number;
  size?: number;
  stroke?: number;
  showLabel?: boolean;
}

/** Circular progress indicator with an eased percentage label in the middle. */
export function ProgressRing({ value, size = 40, stroke = 3, showLabel = true }: ProgressRingProps) {
  const tweened = useTweenedNumber(Math.min(1, Math.max(0, value)));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} className="stroke-white/25" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - tweened)}
          className="stroke-white drop-shadow-[0_0_4px_rgb(255_255_255/0.6)]"
        />
      </svg>
      {showLabel && (
        <span className="absolute inset-0 flex items-center justify-center font-mono text-[10px] font-semibold tabular-nums text-white">
          {Math.round(tweened * 100)}
        </span>
      )}
    </div>
  );
}
