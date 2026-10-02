"use client";

import { useId, useState, type ReactNode } from "react";

import { ChevronDownIcon } from "@/components/ui/icons";

interface CollapsibleProps {
  title: ReactNode;
  icon?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}

/**
 * Disclosure panel with a smooth height animation. Animating grid rows
 * between 0fr and 1fr lets the content keep its natural height without
 * measuring it in JavaScript.
 */
export function Collapsible({ title, icon, defaultOpen = false, children }: CollapsibleProps) {
  const [open, setOpen] = useState(defaultOpen);
  const contentId = useId();

  return (
    <div
      className={`rounded-xl border bg-bg-subtle transition-colors duration-300 ${
        open ? "border-border-strong" : "border-border hover:border-border-strong"
      }`}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={() => setOpen((value) => !value)}
        className="group flex w-full items-center justify-between gap-2 rounded-xl px-3.5 py-3 text-left text-[13px] font-medium text-fg-muted outline-none transition-colors hover:text-fg focus-visible:ring-2 focus-visible:ring-primary-ring"
      >
        <span className="flex items-center gap-2">
          {icon}
          {title}
        </span>
        <span
          className={`flex h-6 w-6 items-center justify-center rounded-md transition-[transform,background-color] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:bg-surface-3 ${
            open ? "rotate-180 bg-surface-3 text-fg" : ""
          }`}
        >
          <ChevronDownIcon className="h-4 w-4" />
        </span>
      </button>

      <div
        id={contentId}
        role="region"
        aria-hidden={!open}
        inert={!open}
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div
            className={`border-t border-border px-3.5 py-3 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              open ? "translate-y-0" : "-translate-y-2"
            }`}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
