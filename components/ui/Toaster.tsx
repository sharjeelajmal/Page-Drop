"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import { AlertIcon, CheckCircleIcon, CloseIcon } from "@/components/ui/icons";

type ToastTone = "success" | "error";

interface Toast {
  id: number;
  tone: ToastTone;
  message: string;
}

interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error("useToast must be used inside <Toaster>");
  return api;
}

let nextId = 1;

/** Provides toast notifications (bottom-right stack, auto-dismiss). */
export function Toaster({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const push = useCallback(
    (tone: ToastTone, message: string) => {
      const id = nextId++;
      setToasts((list) => [...list.slice(-3), { id, tone, message }]);
      window.setTimeout(() => dismiss(id), tone === "error" ? 6000 : 3500);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({ success: (m) => push("success", m), error: (m) => push("error", m) }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed right-4 bottom-4 z-[60] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className="pointer-events-auto flex animate-toast-in items-start gap-3 rounded-xl border border-border bg-surface/95 px-4 py-3 shadow-elevated backdrop-blur-xl"
          >
            {toast.tone === "success" ? (
              <CheckCircleIcon className="mt-px h-[18px] w-[18px] shrink-0 text-success" />
            ) : (
              <AlertIcon className="mt-px h-[18px] w-[18px] shrink-0 text-danger" />
            )}
            <p className="min-w-0 flex-1 text-sm text-fg">{toast.message}</p>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              aria-label="Dismiss"
              className="-mr-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-fg-subtle hover:bg-surface-2 hover:text-fg"
            >
              <CloseIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
