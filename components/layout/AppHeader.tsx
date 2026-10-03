import { KeyRound } from "lucide-react";
import Link from "next/link";

import { BrandLogo } from "@/components/layout/BrandLogo";
import { LogoutButton } from "@/components/layout/LogoutButton";
import { NavLinks } from "@/components/layout/NavLinks";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import type { ViewerRole } from "@/types/project";

export function AppHeader({ role }: { role: ViewerRole }) {
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-bg/70 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="group flex shrink-0 items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-primary-ring"
        >
          <span className="transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:-rotate-6 group-hover:scale-110">
            <BrandLogo priority />
          </span>
          <span className="hidden text-[16px] font-semibold tracking-tight text-fg sm:inline">PageDrop</span>
        </Link>

        <NavLinks />

        <div className="flex shrink-0 items-center gap-2">
          {role === "private" && (
            <span
              title="Signed in with the private account — locked projects are visible"
              className="hidden items-center gap-1.5 rounded-full border border-violet-400/30 bg-violet-500/10 px-2.5 py-1 text-xs font-medium text-violet-600 md:inline-flex dark:text-violet-300"
            >
              <KeyRound className="h-3.5 w-3.5" />
              Private
            </span>
          )}
          <ThemeToggle />
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
