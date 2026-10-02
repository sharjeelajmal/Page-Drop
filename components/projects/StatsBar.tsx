"use client";

import type { ReactNode } from "react";

import { DatabaseIcon, FileCodeIcon, GlobeIcon, ImageIcon } from "@/components/ui/icons";
import { useTweenedNumber } from "@/hooks/useTweenedNumber";
import { formatBytes } from "@/lib/config";
import type { ProjectSummaryDTO } from "@/types/project";

export function StatsBar({ projects }: { projects: ProjectSummaryDTO[] }) {
  const live = projects.filter((p) => p.status === "ready").length;
  const files = projects.reduce((sum, p) => sum + p.fileCount, 0);
  const bytes = projects.reduce((sum, p) => sum + p.totalBytes, 0);
  const assets = projects.reduce((sum, p) => sum + p.assetCount, 0);

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Stat index={0} icon={<GlobeIcon className="h-4 w-4" />} label="Projects" value={projects.length} detail={`${live} live`} />
      <Stat index={1} icon={<FileCodeIcon className="h-4 w-4" />} label="Published files" value={files} />
      <Stat index={2} icon={<DatabaseIcon className="h-4 w-4" />} label="Storage used" value={bytes} format={formatBytes} />
      <Stat index={3} icon={<ImageIcon className="h-4 w-4" />} label="Uploaded assets" value={assets} />
    </div>
  );
}

function Stat({
  index,
  icon,
  label,
  value,
  detail,
  format = (n) => Math.round(n).toLocaleString(),
}: {
  index: number;
  icon: ReactNode;
  label: string;
  value: number;
  detail?: string;
  format?: (n: number) => string;
}) {
  const tweened = useTweenedNumber(value, 900, 0);
  return (
    <div
      className="group relative animate-slide-up overflow-hidden rounded-2xl border border-border bg-surface p-4 shadow-card transition-[border-color,transform] duration-300 hover:-translate-y-0.5 hover:border-primary/30"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div
        aria-hidden="true"
        className="absolute -top-10 -right-10 h-28 w-28 rounded-full bg-primary/10 blur-2xl transition-opacity duration-300 group-hover:opacity-100 sm:opacity-60"
      />
      <div className="relative flex items-center justify-between">
        <span className="text-xs font-medium text-fg-subtle">{label}</span>
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-soft text-primary">{icon}</span>
      </div>
      <p className="relative mt-3 text-2xl font-semibold tracking-tight text-fg tabular-nums">{format(tweened)}</p>
      {detail && <p className="relative mt-0.5 text-xs text-fg-subtle">{detail}</p>}
    </div>
  );
}
