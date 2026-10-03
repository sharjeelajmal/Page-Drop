"use client";

import { Activity, Files, HardDrive, Images } from "lucide-react";
import type { ReactNode } from "react";

import { IconTile } from "@/components/ui/IconTile";
import { Tilt } from "@/components/ui/Tilt";
import { useTweenedNumber } from "@/hooks/useTweenedNumber";
import { formatBytes } from "@/lib/config";
import type { ProjectSummaryDTO } from "@/types/project";

type Tone = "brand" | "sky" | "violet" | "emerald";

export function StatsBar({ projects }: { projects: ProjectSummaryDTO[] }) {
  const live = projects.filter((p) => p.status === "ready").length;
  const files = projects.reduce((sum, p) => sum + p.fileCount, 0);
  const bytes = projects.reduce((sum, p) => sum + p.totalBytes, 0);
  const assets = projects.reduce((sum, p) => sum + p.assetCount, 0);

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <Stat index={0} tone="brand" icon={<Activity />} label="Projects" value={projects.length} detail={`${live} live`} />
      <Stat index={1} tone="sky" icon={<Files />} label="Published files" value={files} />
      <Stat index={2} tone="violet" icon={<HardDrive />} label="Storage used" value={bytes} format={formatBytes} />
      <Stat index={3} tone="emerald" icon={<Images />} label="Uploaded assets" value={assets} />
    </div>
  );
}

function Stat({
  index,
  tone,
  icon,
  label,
  value,
  detail,
  format = (n) => Math.round(n).toLocaleString(),
}: {
  index: number;
  tone: Tone;
  icon: ReactNode;
  label: string;
  value: number;
  detail?: string;
  format?: (n: number) => string;
}) {
  const tweened = useTweenedNumber(value, 900, 0);
  return (
    <div className="animate-slide-up" style={{ animationDelay: `${index * 70}ms` }}>
      <Tilt max={8} className="edge glass depth-2 relative h-full overflow-hidden rounded-[20px] border border-border/60 p-5">
        <div
          aria-hidden="true"
          className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-primary/15 blur-2xl"
        />
        <div className="relative flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-fg-subtle">{label}</p>
            <p className="mt-2 text-[28px] leading-none font-bold tracking-tight text-fg tabular-nums">{format(tweened)}</p>
            {detail && <p className="mt-1.5 text-xs text-fg-subtle">{detail}</p>}
          </div>
          <IconTile tone={tone} size="md">
            {icon}
          </IconTile>
        </div>
      </Tilt>
    </div>
  );
}
