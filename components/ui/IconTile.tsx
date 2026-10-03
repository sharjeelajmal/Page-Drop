import type { ReactNode } from "react";

type Tone = "brand" | "sky" | "violet" | "emerald" | "amber" | "slate";
type Size = "sm" | "md" | "lg";

const TONES: Record<Tone, string> = {
  brand: "from-[#60a5fa] via-[#3b82f6] to-[#4f46e5] shadow-[0_10px_24px_-10px_rgba(59,130,246,0.85)]",
  sky: "from-[#7dd3fc] via-[#38bdf8] to-[#0284c7] shadow-[0_10px_24px_-10px_rgba(14,165,233,0.8)]",
  violet: "from-[#c4b5fd] via-[#8b5cf6] to-[#6d28d9] shadow-[0_10px_24px_-10px_rgba(139,92,246,0.85)]",
  emerald: "from-[#6ee7b7] via-[#10b981] to-[#047857] shadow-[0_10px_24px_-10px_rgba(16,185,129,0.8)]",
  amber: "from-[#fcd34d] via-[#f59e0b] to-[#b45309] shadow-[0_10px_24px_-10px_rgba(245,158,11,0.8)]",
  slate: "from-[#94a3b8] via-[#64748b] to-[#334155] shadow-[0_10px_24px_-10px_rgba(51,65,85,0.8)]",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 w-8 rounded-[10px] [&_svg]:h-4 [&_svg]:w-4",
  md: "h-10 w-10 rounded-xl [&_svg]:h-[18px] [&_svg]:w-[18px]",
  lg: "h-14 w-14 rounded-2xl [&_svg]:h-6 [&_svg]:w-6",
};

/**
 * Glossy "3D" icon tile: gradient body, top highlight, inner bottom shade and
 * a coloured drop shadow.
 */
export function IconTile({ children, tone = "brand", size = "md", className = "" }: {
  children: ReactNode;
  tone?: Tone;
  size?: Size;
  className?: string;
}) {
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden bg-gradient-to-br text-white ${TONES[tone]} ${SIZES[size]} ${className}`}
    >
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/35 to-transparent" />
      <span aria-hidden="true" className="absolute inset-0 rounded-[inherit] shadow-[inset_0_-3px_6px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.45)]" />
      <span className="relative drop-shadow-[0_1px_1px_rgba(0,0,0,0.25)]">{children}</span>
    </span>
  );
}
