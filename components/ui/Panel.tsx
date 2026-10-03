import type { ReactNode } from "react";

import { IconTile } from "@/components/ui/IconTile";

interface PanelProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  iconTone?: "brand" | "sky" | "violet" | "emerald" | "amber" | "slate";
  meta?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Glass panel with a gradient hairline edge and layered depth shadow. */
export function Panel({ title, description, icon, iconTone = "brand", meta, action, children, className = "" }: PanelProps) {
  return (
    <section className={`edge glass depth-2 rounded-[22px] border border-border/60 ${className}`}>
      <header className="flex items-center justify-between gap-4 border-b border-border/70 px-5 py-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3.5">
          {icon && (
            <IconTile tone={iconTone} size="md">
              {icon}
            </IconTile>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-[16px] font-semibold tracking-tight text-fg">{title}</h2>
              {meta}
            </div>
            {description && <p className="mt-0.5 truncate text-[13px] text-fg-subtle">{description}</p>}
          </div>
        </div>
        {action}
      </header>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}
