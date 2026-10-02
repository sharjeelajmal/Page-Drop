import Link from "next/link";

import { BrandLogo } from "@/components/layout/BrandLogo";
import { LogoutButton } from "@/components/layout/LogoutButton";
import { NavLinks } from "@/components/layout/NavLinks";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/75 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="group flex shrink-0 items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-primary-ring"
        >
          <span className="transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:-rotate-6 group-hover:scale-105">
            <BrandLogo priority />
          </span>
          <span className="hidden text-[15px] font-semibold tracking-tight text-fg sm:inline">PageDrop</span>
        </Link>

        <NavLinks />

        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle />
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
