import type { ReactNode } from "react";

interface PanelProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  meta?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Panel({ title, description, icon, meta, action, children, className = "" }: PanelProps) {
  return (
    <section
      className={`overflow-hidden rounded-2xl border border-border bg-surface shadow-elevated ${className}`}
    >
      <header className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          {icon && (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-2 text-fg-muted">
              {icon}
            </span>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-[15px] font-semibold tracking-tight text-fg">{title}</h2>
              {meta}
            </div>
            {description && <p className="mt-0.5 truncate text-[13px] text-fg-subtle">{description}</p>}
          </div>
        </div>
        {action}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}
