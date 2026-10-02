"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { EyeIcon, LockIcon, ShieldIcon } from "@/components/ui/icons";

/**
 * Optional, on-demand preview. The page loads in an iframe sandboxed without
 * allow-same-origin (and the server adds its own CSP sandbox), so uploaded
 * scripts run in an opaque origin and cannot touch the dashboard.
 */
export function LivePreview({ url }: { url: string }) {
  const [loaded, setLoaded] = useState(false);
  const displayUrl = url.replace(/^https?:\/\//, "");

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface-2">
      <div className="flex items-center gap-3 border-b border-border px-3 py-2">
        <div className="flex gap-1.5" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-border-strong" />
          <span className="h-2.5 w-2.5 rounded-full bg-border-strong" />
          <span className="h-2.5 w-2.5 rounded-full bg-border-strong" />
        </div>
        <div className="flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-md bg-surface px-3 py-1 text-[11px] text-fg-subtle">
          <LockIcon className="h-3 w-3 shrink-0" />
          <span className="truncate font-mono">{displayUrl}</span>
        </div>
        <span className="w-[42px]" aria-hidden="true" />
      </div>

      <div className="relative h-[360px] bg-bg">
        {loaded ? (
          <iframe
            src={url}
            title="Live preview"
            sandbox="allow-scripts allow-forms allow-popups allow-modals"
            referrerPolicy="no-referrer"
            loading="lazy"
            className="h-full w-full border-0 bg-white"
          />
        ) : (
          <div className="bg-grid absolute inset-0" aria-hidden="true" />
        )}
        {!loaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-surface text-primary shadow-card">
              <EyeIcon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-fg">Live preview</p>
              <p className="mt-0.5 flex items-center justify-center gap-1 text-xs text-fg-subtle">
                <ShieldIcon className="h-3.5 w-3.5" /> Runs in an isolated sandbox
              </p>
            </div>
            <Button size="sm" variant="secondary" onClick={() => setLoaded(true)}>
              Load preview
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
