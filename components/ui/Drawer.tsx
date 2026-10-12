"use client";

import { useEffect, useId, type ReactNode } from "react";

import { CloseIcon } from "@/components/ui/icons";
import { usePresence } from "@/hooks/usePresence";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}

/** Right-hand side sheet with slide animation; Esc or backdrop closes it. */
export function Drawer({ open, onClose, title, subtitle, actions, children }: DrawerProps) {
  const { mounted, closing } = usePresence(open, 260);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, onClose]);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-40">
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`absolute inset-0 bg-black/40 backdrop-blur-[2px] ${closing ? "animate-fade-out" : "animate-fade-in"}`}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`absolute inset-y-0 right-0 flex w-full max-w-2xl flex-col border-l border-border bg-surface shadow-elevated ${
          closing ? "animate-slide-out-right" : "animate-slide-in-right"
        }`}
      >
        <header className="flex items-start gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="truncate text-base font-semibold tracking-tight text-fg">
              {title}
            </h2>
            {subtitle && <div className="mt-0.5 text-[13px] text-fg-subtle">{subtitle}</div>}
          </div>
          {actions}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-fg-subtle transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
      </aside>
    </div>
  );
}
