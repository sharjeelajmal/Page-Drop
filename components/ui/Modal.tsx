"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

import { CloseIcon } from "@/components/ui/icons";
import { usePresence } from "@/hooks/usePresence";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
  tone?: "default" | "danger";
  children: ReactNode;
  footer?: ReactNode;
}

/** Centered dialog with backdrop blur, enter/exit animation, Esc to close. */
export function Modal({ open, onClose, title, description, icon, tone = "default", children, footer }: ModalProps) {
  const { mounted, closing } = usePresence(open);
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const previous = document.activeElement as HTMLElement | null;
    // Focus the first field/button inside the dialog.
    panelRef.current?.querySelector<HTMLElement>("input, textarea, button:not([data-close])")?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [open, onClose]);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`absolute inset-0 bg-black/50 backdrop-blur-sm ${closing ? "animate-fade-out" : "animate-fade-in"}`}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`relative w-full max-w-md overflow-hidden rounded-2xl border border-border bg-surface shadow-elevated ${
          closing ? "animate-scale-out" : "animate-scale-in"
        }`}
      >
        <div className="flex items-start gap-3.5 p-5 pb-4">
          {icon && (
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                tone === "danger" ? "bg-danger-soft text-danger" : "bg-primary-soft text-primary"
              }`}
            >
              {icon}
            </span>
          )}
          <div className="min-w-0 flex-1 pt-0.5">
            <h2 id={titleId} className="text-base font-semibold tracking-tight text-fg">
              {title}
            </h2>
            {description && <div className="mt-1 text-sm text-fg-muted">{description}</div>}
          </div>
          <button
            type="button"
            data-close
            onClick={onClose}
            aria-label="Close"
            className="-mt-1 -mr-1 flex h-8 w-8 items-center justify-center rounded-lg text-fg-subtle transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 pb-5">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-border bg-bg-subtle px-5 py-3.5">{footer}</div>
        )}
      </div>
    </div>
  );
}
