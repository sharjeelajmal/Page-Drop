"use client";

import { Eye, Link2, Lock } from "lucide-react";

import { PagePreview } from "@/components/projects/PagePreview";
import { ProjectActions, type ProjectHandlers } from "@/components/projects/ProjectActions";
import { ProjectThumb } from "@/components/projects/ProjectThumb";
import { StatusBadge } from "@/components/projects/StatusBadge";
import { Badge } from "@/components/ui/Badge";
import { Tilt } from "@/components/ui/Tilt";
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

/** Grid card: live page preview in a browser frame, meta and an action toolbar, with 3D tilt. */
export function ProjectCard({ project, index, now, handlers }: ProjectItemProps) {
  const shortUrl = project.publicUrl.replace(/^https?:\/\//, "");
  return (
    // Entrance animation lives on the wrapper so it doesn't fight the tilt transform.
    <article className="animate-slide-up" style={stagger(index)}>
      <Tilt
        max={5}
        className="edge glass depth-2 group relative flex h-full flex-col rounded-[22px] border border-border/60 transition-shadow duration-300 hover:shadow-[var(--depth-3)]"
      >
        <div className="p-3 pb-0">
          <div className="depth-1 overflow-hidden rounded-[14px] border border-border/70 bg-surface">
            {/* Browser chrome */}
            <div className="flex items-center gap-1.5 border-b border-border/70 bg-bg-subtle/80 px-3 py-2">
              <span className="h-2 w-2 rounded-full bg-[#ff5f57]" />
              <span className="h-2 w-2 rounded-full bg-[#febc2e]" />
              <span className="h-2 w-2 rounded-full bg-[#28c840]" />
              <span className="ml-2 min-w-0 flex-1 truncate rounded-md bg-surface px-2 py-0.5 font-mono text-[10.5px] text-fg-subtle">
                {shortUrl}
              </span>
              {project.locked && (
                <span title="Locked — hidden from admin" className="text-violet-500 dark:text-violet-300">
                  <Lock className="h-3.5 w-3.5" />
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => handlers.onView(project)}
              className="relative block aspect-[16/10] w-full overflow-hidden text-left outline-none focus-visible:ring-2 focus-visible:ring-primary-ring focus-visible:ring-inset"
              aria-label={`View ${project.name}`}
            >
              <PagePreview
                project={project}
                className="h-full w-full transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.05]"
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
              <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all duration-300 group-hover:bg-black/20 group-hover:opacity-100">
                <span className="depth-2 flex translate-y-2 items-center gap-1.5 rounded-full bg-surface/95 px-3.5 py-1.5 text-xs font-semibold text-fg transition-transform duration-300 group-hover:translate-y-0">
                  <Eye className="h-3.5 w-3.5 text-primary" />
                  View details
                </span>
              </span>
            </button>
          </div>
        </div>

        <div className="flex-1 px-5 pt-4 pb-3">
          <div className="flex items-center gap-2">
            <h3 className="min-w-0 truncate text-[16px] font-semibold tracking-tight text-fg" title={project.name}>
              {project.name}
            </h3>
            {project.locked && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-violet-400/40 bg-violet-500/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-violet-600 uppercase dark:text-violet-300">
                <Lock className="h-3 w-3" />
                Locked
              </span>
            )}
          </div>
          <a
            href={project.publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex max-w-full items-center gap-1 truncate font-mono text-xs text-primary hover:underline"
          >
            <Link2 className="h-3 w-3 shrink-0" />
            <span className="truncate">{shortUrl}</span>
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

        <div className="mx-3 mb-3 flex items-center justify-between rounded-xl border border-border/70 bg-bg-subtle/70 px-1.5 py-1">
          <ProjectActions project={project} handlers={handlers} />
        </div>
      </Tilt>
    </article>
  );
}

/** Compact row for the list view. */
export function ProjectRow({ project, index, now, handlers }: ProjectItemProps) {
  return (
    <li
      className="glass depth-1 group flex animate-slide-up items-center gap-4 rounded-2xl border border-border/70 px-3 py-2.5 transition-[border-color,transform] duration-200 hover:-translate-y-px hover:border-primary/35"
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
          <span className="flex items-center gap-1.5 truncate text-sm font-semibold text-fg group-hover:text-primary">
            {project.locked && <Lock className="h-3.5 w-3.5 shrink-0 text-violet-500 dark:text-violet-300" />}
            <span className="truncate">{project.name}</span>
          </span>
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
