"use client";

import { useId, useSyncExternalStore } from "react";

import { AlertIcon, CheckIcon, GlobeIcon, SpinnerIcon } from "@/components/ui/icons";
import type { SlugStatus } from "@/hooks/useSlugAvailability";
import {
  CUSTOM_SLUG_HINT,
  CUSTOM_SLUG_MAX,
  RESERVED_SLUG_HINT,
  finalizeSlug,
  isReservedSlug,
  slugify,
} from "@/lib/slug";

interface ProjectLinkFieldProps {
  value: string;
  onChange: (value: string) => void;
  status: SlugStatus;
  reason?: string;
}

const noopSubscribe = () => () => {};
/** Base of public links: NEXT_PUBLIC_APP_URL if set, else the current site. */
const getBase = () => (process.env.NEXT_PUBLIC_APP_URL || window.location.origin).replace(/\/+$/, "");

/** "your-site.com/ [ my-page ]" input with a live availability check. */
export function ProjectLinkField({ value, onChange, status, reason }: ProjectLinkFieldProps) {
  const id = useId();
  const base = useSyncExternalStore(noopSubscribe, getBase, () => "");
  const prefix = `${base.replace(/^https?:\/\//, "")}/`;

  const tone =
    status === "available"
      ? "border-success/50 focus-within:border-success focus-within:ring-success-soft"
      : status === "taken" || status === "invalid"
        ? "border-danger/50 focus-within:border-danger focus-within:ring-danger-soft"
        : "border-border-strong focus-within:border-primary focus-within:ring-primary-soft";

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[13px] font-semibold text-fg">
          Project link
        </label>
        <span className="text-xs text-fg-subtle">Optional · leave empty for a random link</span>
      </div>

      <div
        className={`flex items-center overflow-hidden rounded-xl border bg-surface transition-[border-color,box-shadow] duration-200 focus-within:ring-4 ${tone}`}
      >
        <span className="flex shrink-0 items-center gap-2 self-stretch border-r border-border bg-bg-subtle pr-2.5 pl-3.5 font-mono text-[13px] text-fg-subtle">
          <GlobeIcon className="h-4 w-4 text-primary" />
          <span className="max-w-[46vw] truncate sm:max-w-none">{prefix}</span>
        </span>
        <input
          id={id}
          value={value}
          onChange={(event) => onChange(slugify(event.target.value))}
          onBlur={() => onChange(finalizeSlug(value))}
          placeholder="my-landing-page"
          maxLength={CUSTOM_SLUG_MAX}
          spellCheck={false}
          autoComplete="off"
          aria-describedby={`${id}-status`}
          aria-invalid={status === "taken" || status === "invalid"}
          className="h-11 min-w-0 flex-1 bg-transparent px-3 font-mono text-[14px] text-fg outline-none placeholder:text-fg-subtle/70"
        />
        <span className="flex w-10 shrink-0 items-center justify-center" aria-hidden="true">
          {status === "checking" && <SpinnerIcon className="h-4 w-4 text-primary" />}
          {status === "available" && (
            <span className="flex h-5 w-5 animate-pop-in items-center justify-center rounded-full bg-success text-white">
              <CheckIcon className="h-3 w-3" strokeWidth={3} />
            </span>
          )}
          {(status === "taken" || status === "invalid") && <AlertIcon className="h-[18px] w-[18px] animate-pop-in text-danger" />}
        </span>
      </div>

      <p id={`${id}-status`} aria-live="polite" className="min-h-[18px] text-xs">
        {status === "empty" && <span className="text-fg-subtle">Letters, numbers and hyphens, e.g. summer-sale-2026</span>}
        {status === "checking" && <span className="text-fg-subtle">Checking availability…</span>}
        {status === "available" && (
          <span className="text-success">
            Available — your page will be live at{" "}
            <span className="font-mono font-medium">
              {prefix}
              {value}
            </span>
          </span>
        )}
        {status === "taken" && <span className="text-danger">{reason ?? "This link is already taken."} Try another one.</span>}
        {status === "invalid" && (
          <span className="text-danger">{isReservedSlug(value) ? RESERVED_SLUG_HINT : CUSTOM_SLUG_HINT}</span>
        )}
      </p>
    </div>
  );
}
