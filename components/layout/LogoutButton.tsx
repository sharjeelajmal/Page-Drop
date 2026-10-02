"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { SpinnerIcon } from "@/components/ui/icons";

export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const logout = async () => {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  };

  return (
    <button
      type="button"
      onClick={logout}
      disabled={busy}
      title="Sign out"
      aria-label="Sign out"
      className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface-2 text-fg-subtle transition-all duration-200 outline-none hover:border-danger/30 hover:bg-danger-soft hover:text-danger focus-visible:ring-2 focus-visible:ring-primary-ring disabled:opacity-60"
    >
      {busy ? (
        <SpinnerIcon className="h-3.5 w-3.5" />
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
          <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
          <path d="M10 17l-5-5 5-5" />
          <path d="M5 12h11" />
        </svg>
      )}
    </button>
  );
}
