"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { LivePreview } from "@/components/dashboard/LivePreview";
import { StatusBadge } from "@/components/projects/StatusBadge";
import { Button, ButtonLink, buttonClasses } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { Drawer } from "@/components/ui/Drawer";
import {
  AlertIcon,
  ExternalIcon,
  FileCodeIcon,
  GlobeIcon,
  ImageIcon,
  PencilIcon,
  RetryIcon,
  TrashIcon,
} from "@/components/ui/icons";
import { getErrorMessage } from "@/lib/client/api";
import { formatDateTime } from "@/lib/client/format";
import { fetchProject } from "@/lib/client/projects";
import { formatBytes } from "@/lib/config";
import type { ProjectDTO, ProjectSummaryDTO } from "@/types/project";

import type { ProjectHandlers } from "@/components/projects/ProjectActions";

interface ProjectDrawerProps {
  project: ProjectSummaryDTO | null;
  /** Bumped by the parent after a rename/redeploy so details are refetched. */
  version: number;
  onClose: () => void;
  handlers: Omit<ProjectHandlers, "onView">;
}

type Details = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; project: ProjectDTO };

export function ProjectDrawer({ project, version, onClose, handlers }: ProjectDrawerProps) {
  const [details, setDetails] = useState<{ key: string; value: Details } | null>(null);
  const key = project ? `${project.projectId}:${version}` : "";

  useEffect(() => {
    if (!project) return;
    let cancelled = false;
    fetchProject(project.projectId)
      .then((full) => !cancelled && setDetails({ key, value: { status: "ready", project: full } }))
      .catch((error) => !cancelled && setDetails({ key, value: { status: "error", message: getErrorMessage(error) } }));
    return () => {
      cancelled = true;
    };
  }, [project, key]);

  // Show "loading" until the fetch for the current project/version settles.
  const current: Details = details && details.key === key ? details.value : { status: "loading" };

  return (
    <Drawer
      open={project !== null}
      onClose={onClose}
      title={project?.name ?? ""}
      subtitle={project && <StatusBadge status={project.status} />}
    >
      {project && (
        <div className="space-y-6">
          <div className="flex items-center gap-1 rounded-xl border border-border bg-bg-subtle p-1.5 pl-3.5">
            <GlobeIcon className="h-4 w-4 shrink-0 text-primary" />
            <a
              href={project.publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="min-w-0 flex-1 truncate px-1.5 font-mono text-sm text-fg hover:text-primary"
            >
              {project.publicUrl}
            </a>
            <CopyButton value={project.publicUrl} label="Copy URL" />
          </div>

          <div className="flex flex-wrap gap-2">
            <ButtonLink href={project.publicUrl} target="_blank" rel="noopener noreferrer" variant="primary" size="sm">
              <ExternalIcon className="h-4 w-4" />
              Open page
            </ButtonLink>
            <Button variant="secondary" size="sm" onClick={() => handlers.onRename(project)}>
              <PencilIcon className="h-4 w-4" />
              Rename
            </Button>
            <Button variant="secondary" size="sm" onClick={() => handlers.onRedeploy(project)}>
              <RetryIcon className="h-4 w-4" />
              Redeploy
            </Button>
            <Link href={`/?project=${project.projectId}`} className={buttonClasses("secondary", "sm")}>
              <ImageIcon className="h-4 w-4" />
              Manage assets
            </Link>
            <Button variant="danger" size="sm" onClick={() => handlers.onDelete(project)}>
              <TrashIcon className="h-4 w-4" />
              Delete
            </Button>
          </div>

          <LivePreview key={key} url={project.publicUrl} />

          {current.status === "loading" && <DetailsSkeleton />}
          {current.status === "error" && (
            <p className="flex items-center gap-2 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
              <AlertIcon className="h-4 w-4" />
              {current.message}
            </p>
          )}
          {current.status === "ready" && <ProjectDetails project={current.project} />}
        </div>
      )}
    </Drawer>
  );
}

function ProjectDetails({ project }: { project: ProjectDTO }) {
  const rows: [string, string, boolean?][] = [
    ["Type", project.type === "zip" ? "ZIP project" : "Single HTML"],
    ["Source", project.originalFileName, true],
    ["Entry file", project.entryFile, true],
    ["Size", formatBytes(project.totalBytes)],
    ["Created", formatDateTime(project.createdAt)],
    ["Updated", formatDateTime(project.updatedAt)],
    ["Project ID", project.projectId, true],
    ["Slug", project.slug, true],
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border">
        {rows.map(([label, value, mono]) => (
          <div key={label} className="min-w-0 bg-surface p-3">
            <dt className="text-[11px] font-medium uppercase tracking-[0.06em] text-fg-subtle">{label}</dt>
            <dd className={`mt-1 truncate text-sm text-fg ${mono ? "font-mono text-[13px]" : ""}`} title={value}>
              {value}
            </dd>
          </div>
        ))}
      </dl>

      {project.assets.length > 0 && (
        <section>
          <h3 className="mb-2.5 text-[13px] font-semibold text-fg">Assets · {project.assets.length}</h3>
          <ul className="grid grid-cols-4 gap-2 sm:grid-cols-5">
            {project.assets.map((asset) => (
              <li key={asset.id} title={asset.originalName}>
                <a
                  href={asset.cloudinaryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-checker block aspect-square overflow-hidden rounded-lg border border-border transition-transform duration-200 hover:scale-105"
                >
                  {/* Cloudinary thumbnail; remote domain is not configured for next/image. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={asset.cloudinaryUrl} alt={asset.originalName} loading="lazy" className="h-full w-full object-contain p-1" />
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h3 className="mb-2.5 text-[13px] font-semibold text-fg">Files · {project.files.length}</h3>
        <ul className="max-h-72 divide-y divide-border overflow-y-auto rounded-xl border border-border">
          {project.files.map((file) => (
            <li key={file.path} className="flex items-center gap-2.5 px-3 py-2 text-[13px]">
              {file.resourceType === "image" ? (
                <ImageIcon className="h-4 w-4 shrink-0 text-primary" />
              ) : (
                <FileCodeIcon className="h-4 w-4 shrink-0 text-fg-subtle" />
              )}
              <span className="min-w-0 flex-1 truncate font-mono text-fg" title={file.path}>
                {file.path}
              </span>
              <span className="shrink-0 text-xs tabular-nums text-fg-subtle">{formatBytes(file.bytes)}</span>
            </li>
          ))}
        </ul>
      </section>

      {project.warnings.length > 0 && (
        <ul className="space-y-1 rounded-xl border border-warning/25 bg-warning-soft px-4 py-3 text-[13px] text-fg-muted">
          {project.warnings.map((warning) => (
            <li key={warning}>• {warning}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DetailsSkeleton() {
  return (
    <div className="space-y-3" aria-hidden="true">
      <div className="skeleton h-40 rounded-xl" />
      <div className="skeleton h-24 rounded-xl" />
    </div>
  );
}
