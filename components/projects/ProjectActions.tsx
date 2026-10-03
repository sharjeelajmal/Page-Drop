"use client";

import { ExternalLink, Lock, LockOpen, PencilLine, RefreshCw, Trash2 } from "lucide-react";
import type { ReactNode } from "react";

import { CopyButton } from "@/components/ui/CopyButton";
import type { ProjectSummaryDTO } from "@/types/project";

export interface ProjectHandlers {
  onView: (project: ProjectSummaryDTO) => void;
  onRename: (project: ProjectSummaryDTO) => void;
  onRedeploy: (project: ProjectSummaryDTO) => void;
  onDelete: (project: ProjectSummaryDTO) => void;
  /** Present only for the private account. */
  onToggleLock?: (project: ProjectSummaryDTO) => void;
}

/** Icon toolbar: open, copy URL, rename, redeploy, (un)lock, delete. */
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
        <ExternalLink className="h-4 w-4" />
      </IconLink>
      <CopyButton value={project.publicUrl} label="Copy URL" />
      <IconButton label="Rename" onClick={() => handlers.onRename(project)}>
        <PencilLine className="h-4 w-4" />
      </IconButton>
      <IconButton label="Redeploy with new files" onClick={() => handlers.onRedeploy(project)}>
        <RefreshCw className="h-4 w-4" />
      </IconButton>
      {handlers.onToggleLock && (
        <IconButton
          label={project.locked ? "Unlock (visible to admin)" : "Lock (hide from admin)"}
          onClick={() => handlers.onToggleLock?.(project)}
          accent
        >
          {project.locked ? <LockOpen className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
        </IconButton>
      )}
      <IconButton label="Delete" danger onClick={() => handlers.onDelete(project)}>
        <Trash2 className="h-4 w-4" />
      </IconButton>
    </div>
  );
}

const iconClasses =
  "flex h-8 w-8 items-center justify-center rounded-lg text-fg-muted transition-[background-color,color,transform] duration-150 outline-none hover:bg-surface-2 hover:text-fg focus-visible:ring-2 focus-visible:ring-primary-ring active:scale-90";

function IconButton({
  label,
  danger,
  accent,
  onClick,
  children,
}: {
  label: string;
  danger?: boolean;
  accent?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`${iconClasses} ${danger ? "hover:bg-danger-soft hover:text-danger" : ""} ${
        accent ? "hover:bg-violet-500/10 hover:text-violet-600 dark:hover:text-violet-300" : ""
      }`}
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
