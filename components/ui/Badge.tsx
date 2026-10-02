import type { ReactNode } from "react";

type Tone = "neutral" | "primary" | "success" | "danger" | "warning";

const tones: Record<Tone, string> = {
  neutral: "border-border bg-surface-2 text-fg-muted",
  primary: "border-primary/20 bg-primary-soft text-primary",
  success: "border-success/20 bg-success-soft text-success",
  danger: "border-danger/20 bg-danger-soft text-danger",
  warning: "border-warning/20 bg-warning-soft text-warning",
};

const dots: Record<Tone, string> = {
  neutral: "bg-fg-subtle",
  primary: "bg-primary",
  success: "bg-success animate-pulse-ring",
  danger: "bg-danger",
  warning: "bg-warning",
};

export function Badge({
  tone = "neutral",
  dot = false,
  mono = false,
  children,
}: {
  tone?: Tone;
  dot?: boolean;
  mono?: boolean;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-4 ${
        mono ? "font-mono" : ""
      } ${tones[tone]}`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dots[tone]}`} />}
      {children}
    </span>
  );
}
