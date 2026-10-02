"use client";

import type { ReactNode } from "react";

import { CopyButton } from "@/components/ui/CopyButton";
import { ExternalIcon, PencilIcon, RetryIcon, TrashIcon } from "@/components/ui/icons";
import type { ProjectSummaryDTO } from "@/types/project";

export interface ProjectHandlers {
  onView: (project: ProjectSummaryDTO) => void;
  onRename: (project: ProjectSummaryDTO) => void;
  onRedeploy: (project: ProjectSummaryDTO) => void;
  onDelete: (project: ProjectSummaryDTO) => void;
}

/** Icon toolbar: open, copy URL, rename, redeploy, delete. */
export function ProjectActions({
  project,
  handlers,
}: {
  project: ProjectSummaryDTO;
  handlers: Omit<ProjectHandlers, "onView">;
}) {
  return (
    <div className="flex items-center">
      <IconLink href={project.publicUrl} label="Open page">
        <ExternalIcon className="h-4 w-4" />
      </IconLink>
      <CopyButton value={project.publicUrl} label="Copy URL" />
      <IconButton label="Rename" onClick={() => handlers.onRename(project)}>
        <PencilIcon className="h-4 w-4" />
      </IconButton>
      <IconButton label="Redeploy with new files" onClick={() => handlers.onRedeploy(project)}>
        <RetryIcon className="h-4 w-4" />
      </IconButton>
      <IconButton label="Delete" danger onClick={() => handlers.onDelete(project)}>
        <TrashIcon className="h-4 w-4" />
      </IconButton>
    </div>
  );
}

const iconClasses =
  "flex h-8 w-8 items-center justify-center rounded-lg text-fg-muted transition-[background-color,color,transform] duration-150 outline-none hover:bg-surface-2 hover:text-fg focus-visible:ring-2 focus-visible:ring-primary-ring active:scale-90";

function IconButton({
  label,
  danger,
  onClick,
  children,
}: {
  label: string;
  danger?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`${iconClasses} ${danger ? "hover:bg-danger-soft hover:text-danger" : ""}`}
    >
      {children}
    </button>
  );
}

function IconLink({ href, label, children }: { href: string; label: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} title={label} className={iconClasses}>
      {children}
    </a>
  );
}
