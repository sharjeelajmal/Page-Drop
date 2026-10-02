"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Deploy" },
  { href: "/projects", label: "Projects" },
];

/** Header navigation with an animated active pill. */
export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="relative flex items-center gap-1 rounded-full border border-border bg-surface-2/60 p-1">
      {LINKS.map(({ href, label }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`relative rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-primary-ring ${
              active ? "text-fg" : "text-fg-subtle hover:text-fg"
            }`}
          >
            {active && (
              <span
                aria-hidden="true"
                className="absolute inset-0 animate-pop-in rounded-full bg-surface shadow-card ring-1 ring-border"
              />
            )}
            <span className="relative">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
