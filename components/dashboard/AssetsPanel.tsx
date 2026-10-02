"use client";

import type { ReactNode } from "react";

import { AssetList } from "@/components/dashboard/AssetList";
import { Badge } from "@/components/ui/Badge";
import { Collapsible } from "@/components/ui/Collapsible";
import { Dropzone } from "@/components/ui/Dropzone";
import { ImageIcon, InfoIcon, SpinnerIcon } from "@/components/ui/icons";
import { Panel } from "@/components/ui/Panel";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useTweenedNumber } from "@/hooks/useTweenedNumber";
import type { AssetItem } from "@/lib/client/asset-uploads";
import { ASSET_ACCEPT } from "@/lib/client/validation";
import { LIMITS, formatBytes } from "@/lib/config";

interface AssetsPanelProps {
  items: AssetItem[];
  hasProject: boolean;
  onFiles: (files: File[]) => void;
  onRemove: (localId: string) => void;
  onRetry: (localId: string) => void;
}

export function AssetsPanel({ items, hasProject, onFiles, onRemove, onRetry }: AssetsPanelProps) {
  const uploaded = items.filter((item) => item.status === "uploaded").length;
  const queued = items.filter((item) => item.status === "queued").length;
  const active = items.filter((item) => item.status === "uploading");
  const activeBytes = active.reduce((sum, item) => sum + item.size, 0);
  const overall = activeBytes
    ? active.reduce((sum, item) => sum + item.size * item.progress, 0) / activeBytes
    : 0;

  return (
    <Panel
      title="Assets"
      description="Images & logos stored in Cloudinary"
      icon={<ImageIcon className="h-[18px] w-[18px]" />}
      meta={
        <Badge tone={uploaded > 0 ? "primary" : "neutral"} mono>
          {uploaded}/{LIMITS.maxAssetsPerProject}
        </Badge>
      }
    >
      <div className="space-y-4">
        <Dropzone
          size="sm"
          multiple
          title="Drop images/logos here"
          buttonLabel="Choose Files"
          accept={ASSET_ACCEPT}
          icon={<ImageIcon className="h-[18px] w-[18px]" />}
          onFiles={onFiles}
          hint={`PNG · JPG · WEBP · SVG · GIF · AVIF · ICO — max ${formatBytes(LIMITS.maxAssetBytes)}`}
        />

        {!hasProject && queued > 0 && (
          <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary-soft px-3 py-2.5 text-xs text-fg-muted">
            <InfoIcon className="mt-px h-3.5 w-3.5 shrink-0 text-primary" />
            {queued} file{queued === 1 ? "" : "s"} queued. They upload automatically once the project is deployed.
          </div>
        )}

        {active.length > 0 && (
          <div className="space-y-2 rounded-xl border border-primary/25 bg-primary-soft p-3 animate-slide-up" aria-live="polite">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="flex items-center gap-2 font-medium text-fg">
                <SpinnerIcon className="h-3.5 w-3.5 text-primary" />
                Uploading {active.length} file{active.length === 1 ? "" : "s"}
                {queued > 0 && hasProject && <span className="font-normal text-fg-subtle">· {queued} waiting</span>}
              </span>
              <OverallPercent value={overall} />
            </div>
            <ProgressBar value={overall} size="md" />
          </div>
        )}

        {items.length > 0 ? (
          <AssetList items={items} onRemove={onRemove} onRetry={onRetry} />
        ) : (
          <p className="py-2 text-center text-xs text-fg-subtle">No assets yet</p>
        )}

        <Collapsible title="How assets are matched" icon={<InfoIcon className="h-4 w-4 text-primary" />}>
          <div className="space-y-2 text-xs leading-relaxed text-fg-subtle">
            <p>
              References are matched by <span className="font-medium text-fg-muted">file name</span>. An image named{" "}
              <Code>logo.png</Code> is used for:
            </p>
            <ul className="space-y-1 pl-1">
              <li>
                <Code>&lt;img src=&quot;logo.png&quot;&gt;</Code>
              </li>
              <li>
                <Code>./assets/logo.png</Code>
              </li>
              <li>
                <Code>url(../img/logo.png)</Code> in CSS
              </li>
            </ul>
            <p>
              Lookup order: <span className="font-medium text-fg-muted">uploaded here</span> →{" "}
              <span className="font-medium text-fg-muted">file in your ZIP</span> →{" "}
              <span className="font-medium text-fg-muted">shared logo</span>. Changes are live immediately.
            </p>
          </div>
        </Collapsible>
      </div>
    </Panel>
  );
}

function Code({ children }: { children: ReactNode }) {
  return (
    <code className="rounded-md border border-border bg-surface px-1.5 py-0.5 font-mono text-[11px] text-fg">
      {children}
    </code>
  );
}

function OverallPercent({ value }: { value: number }) {
  const tweened = useTweenedNumber(value);
  return (
    <span className="font-mono text-xs font-semibold tabular-nums text-primary">{Math.round(tweened * 100)}%</span>
  );
}
