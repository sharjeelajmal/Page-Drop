import type { ReactNode } from "react";

import { AppHeader } from "@/components/layout/AppHeader";

/** Header, background treatment and footer shared by the signed-in pages. */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex flex-1 flex-col">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[480px]" aria-hidden="true">
        <div className="bg-grid absolute inset-0" />
        <div className="bg-glow absolute inset-0" />
      </div>

      <AppHeader />

      <main className="relative mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6 sm:py-14 lg:px-8">{children}</main>

      <footer className="relative border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-5 text-xs text-fg-subtle sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <span>PageDrop · Static HTML hosting</span>
          <span className="font-mono">Files on Cloudinary · Metadata in MongoDB</span>
        </div>
      </footer>
    </div>
  );
}
