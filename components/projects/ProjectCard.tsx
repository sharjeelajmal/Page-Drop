"use client";

import { PagePreview } from "@/components/projects/PagePreview";
import { ProjectActions, type ProjectHandlers } from "@/components/projects/ProjectActions";
import { ProjectThumb } from "@/components/projects/ProjectThumb";
import { StatusBadge } from "@/components/projects/StatusBadge";
import { Badge } from "@/components/ui/Badge";
import { EyeIcon } from "@/components/ui/icons";
import { formatBytes } from "@/lib/config";
import { formatRelative } from "@/lib/client/format";
import type { ProjectSummaryDTO } from "@/types/project";

interface ProjectItemProps {
  project: ProjectSummaryDTO;
  index: number;
  now: number;
  handlers: ProjectHandlers;
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

const stagger = (index: number) => ({ animationDelay: `${Math.min(index, 12) * 45}ms` });

/** Grid card with cover, meta and an action toolbar. */
export function ProjectCard({ project, index, now, handlers }: ProjectItemProps) {
  return (
    <article
      className="group relative flex animate-slide-up flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-card transition-[transform,box-shadow,border-color] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 hover:border-primary/35 hover:shadow-elevated"
      style={stagger(index)}
    >
      <button
        type="button"
        onClick={() => handlers.onView(project)}
        className="relative block aspect-[16/9] w-full overflow-hidden border-b border-border text-left outline-none focus-visible:ring-2 focus-visible:ring-primary-ring focus-visible:ring-inset"
        aria-label={`View ${project.name}`}
      >
        <PagePreview
          project={project}
          className="h-full w-full transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
        />
        {/* Badges sit on a soft scrim at the bottom so the page's own header stays visible. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/45 to-transparent"
        />
        <div className="absolute inset-x-3 bottom-3 flex items-center justify-between [&>span]:bg-surface/95 [&>span]:shadow-card [&>span]:backdrop-blur">
          <Badge mono>{project.type === "zip" ? "ZIP" : "HTML"}</Badge>
          <StatusBadge status={project.status} />
        </div>
        <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all duration-300 group-hover:bg-black/25 group-hover:opacity-100">
          <span className="flex translate-y-2 items-center gap-1.5 rounded-full bg-surface/95 px-3 py-1.5 text-xs font-medium text-fg shadow-elevated transition-transform duration-300 group-hover:translate-y-0">
            <EyeIcon className="h-3.5 w-3.5" />
            View details
          </span>
        </span>
      </button>

      <div className="flex-1 p-4">
        <h3 className="truncate text-[15px] font-semibold tracking-tight text-fg" title={project.name}>
          {project.name}
        </h3>
        <a
          href={project.publicUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-0.5 block truncate font-mono text-xs text-primary hover:underline"
        >
          {project.publicUrl.replace(/^https?:\/\//, "")}
        </a>
        <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-fg-subtle">
          <span>{plural(project.fileCount, "file")}</span>
          <Dot />
          <span>{formatBytes(project.totalBytes)}</span>
          {project.assetCount > 0 && (
            <>
              <Dot />
              <span>{plural(project.assetCount, "asset")}</span>
            </>
          )}
          <Dot />
          <span title={new Date(project.updatedAt).toLocaleString()}>{formatRelative(project.updatedAt, now)}</span>
        </p>
      </div>

      <div className="flex items-center justify-between border-t border-border px-2 py-1.5">
        <ProjectActions project={project} handlers={handlers} />
      </div>
    </article>
  );
}

/** Compact row for the list view. */
export function ProjectRow({ project, index, now, handlers }: ProjectItemProps) {
  return (
    <li
      className="group flex animate-slide-up items-center gap-4 rounded-xl border border-border bg-surface px-3 py-2.5 transition-[border-color,background-color] duration-200 hover:border-primary/35 hover:bg-bg-subtle"
      style={stagger(index)}
    >
      <button
        type="button"
        onClick={() => handlers.onView(project)}
        className="flex min-w-0 flex-1 items-center gap-3 text-left outline-none"
        aria-label={`View ${project.name}`}
      >
        <ProjectThumb
          name={project.name}
          type={project.type}
          thumbnailUrl={project.thumbnailUrl}
          className="h-11 w-16 shrink-0 rounded-lg border border-border [&_span]:text-lg [&_svg]:hidden"
        />
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-fg group-hover:text-primary">{project.name}</span>
          <span className="block truncate font-mono text-xs text-fg-subtle">
            {project.publicUrl.replace(/^https?:\/\//, "")}
          </span>
        </span>
      </button>
      <div className="hidden w-16 md:block">
        <Badge mono>{project.type === "zip" ? "ZIP" : "HTML"}</Badge>
      </div>
      <div className="hidden w-20 md:block">
        <StatusBadge status={project.status} />
      </div>
      <span className="hidden w-20 text-right text-xs tabular-nums text-fg-subtle lg:block">
        {plural(project.fileCount, "file")}
      </span>
      <span className="hidden w-20 text-right text-xs tabular-nums text-fg-subtle lg:block">
        {formatBytes(project.totalBytes)}
      </span>
      <span className="hidden w-24 text-right text-xs text-fg-subtle sm:block">{formatRelative(project.updatedAt, now)}</span>
      <ProjectActions project={project} handlers={handlers} />
    </li>
  );
}

function Dot() {
  return <span className="h-0.5 w-0.5 rounded-full bg-fg-subtle" aria-hidden="true" />;
}
