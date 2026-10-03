import type { ReactNode } from "react";

import { AppHeader } from "@/components/layout/AppHeader";
import type { ViewerRole } from "@/types/project";

/** Header, 3D background scene and footer shared by the signed-in pages. */
export function AppShell({ children, role }: { children: ReactNode; role: ViewerRole }) {
  return (
    <div className="relative flex flex-1 flex-col overflow-x-clip">
      <div className="scene" aria-hidden="true">
        <div className="scene-orb scene-orb-a" />
        <div className="scene-orb scene-orb-b" />
        <div className="scene-floor" />
      </div>

      <AppHeader role={role} />

      <main className="relative mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6 sm:py-12 lg:px-8">{children}</main>

      <footer className="relative border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-5 text-xs text-fg-subtle sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <span>PageDrop · Static HTML hosting</span>
          <span className="font-mono">Files on Cloudinary · Metadata in MongoDB</span>
        </div>
      </footer>
    </div>
  );
}
