import { Fragment } from "react";

import { AlertIcon, CheckIcon } from "@/components/ui/icons";

export type StepState = "pending" | "active" | "done" | "error";

export interface PipelineStep {
  label: string;
  state: StepState;
}

/** Compact horizontal pipeline indicator: Upload → Build → Assets → Live. */
export function PipelineSteps({ steps }: { steps: PipelineStep[] }) {
  return (
    <ol className="flex items-center gap-2" aria-label="Deployment progress">
      {steps.map((step, index) => (
        <Fragment key={step.label}>
          {index > 0 && (
            <li aria-hidden="true" className="h-px w-4 bg-border-strong sm:w-6">
              <div
                className={`h-px bg-primary transition-[width] duration-500 ${
                  step.state === "pending" ? "w-0" : "w-full"
                }`}
              />
            </li>
          )}
          <li
            className="flex items-center gap-2"
            aria-current={step.state === "active" ? "step" : undefined}
          >
            <StepDot state={step.state} index={index + 1} />
            <span
              className={`hidden text-[13px] font-medium sm:inline ${
                step.state === "pending" ? "text-fg-subtle" : step.state === "error" ? "text-danger" : "text-fg"
              }`}
            >
              {step.label}
            </span>
          </li>
        </Fragment>
      ))}
    </ol>
  );
}

function StepDot({ state, index }: { state: StepState; index: number }) {
  const base = "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold transition-all";
  switch (state) {
    case "done":
      return (
        <span className={`${base} bg-primary text-primary-fg`}>
          <CheckIcon className="h-3.5 w-3.5" strokeWidth={2.5} />
        </span>
      );
    case "active":
      return (
        <span className={`${base} border border-primary bg-primary-soft text-primary ring-4 ring-primary-soft`}>
          {index}
        </span>
      );
    case "error":
      return (
        <span className={`${base} bg-danger-soft text-danger`}>
          <AlertIcon className="h-3.5 w-3.5" strokeWidth={2.25} />
        </span>
      );
    default:
      return <span className={`${base} border border-border-strong text-fg-subtle`}>{index}</span>;
  }
}
