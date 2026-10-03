"use client";

import { Lock, Rocket } from "lucide-react";

import { LivePreview } from "@/components/dashboard/LivePreview";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import {
  CheckCircleIcon,
  ExternalIcon,
  GlobeIcon,
  PlusIcon,
  WarningIcon,
} from "@/components/ui/icons";
import { Panel } from "@/components/ui/Panel";
import { formatBytes } from "@/lib/config";
import type { ProjectDTO } from "@/types/project";

interface DeploymentPanelProps {
  project: ProjectDTO;
  onNewDeployment: () => void;
}

export function DeploymentPanel({ project, onNewDeployment }: DeploymentPanelProps) {
  const deployedAt = project.createdAt
    ? new Date(project.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
    : "";

  const details: { label: string; value: string; mono?: boolean; copy?: boolean }[] = [
    { label: "Type", value: project.type === "zip" ? "ZIP project" : "Single HTML" },
    { label: "Source", value: project.originalFileName, mono: true },
    { label: "Entry file", value: project.entryFile, mono: true },
    { label: "Files", value: `${project.fileCount} · ${project.imageCount} images` },
    { label: "Size", value: formatBytes(project.totalBytes) },
    { label: "Project ID", value: project.projectId, mono: true, copy: true },
  ];

  return (
    <Panel
      title="Deployment"
      description={deployedAt ? `Deployed ${deployedAt}` : "Published"}
      icon={<Rocket />}
      iconTone="emerald"
      meta={
        <span className="flex items-center gap-1.5">
          <Badge tone="success" dot>
            Ready
          </Badge>
          {project.locked && (
            <span
              title="Locked — hidden from the admin account"
              className="inline-flex items-center gap-1 rounded-full border border-violet-400/40 bg-violet-500/10 px-2 py-0.5 text-[11px] font-medium text-violet-600 dark:text-violet-300"
            >
              <Lock className="h-3 w-3" />
              Locked
            </span>
          )}
        </span>
      }
      action={
        <Button variant="secondary" size="sm" onClick={onNewDeployment}>
          <PlusIcon className="h-4 w-4" />
          <span className="hidden sm:inline">New deployment</span>
        </Button>
      }
    >
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-start gap-3.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success-soft text-success">
            <CheckCircleIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-lg font-semibold tracking-tight text-fg">Your page is ready!</p>
            <p className="truncate text-sm text-fg-muted" title={project.name}>
              {project.name}
            </p>
          </div>
        </div>

        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-subtle">
            Public URL
          </p>
          <div className="flex items-center gap-1 rounded-xl border border-border bg-bg-subtle p-1.5 pl-3.5 transition-colors focus-within:border-primary hover:border-border-strong">
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
          <div className="mt-3 flex flex-wrap gap-2">
            <CopyButton value={project.publicUrl} label="Copy URL" variant="primary" />
            <ButtonLink href={project.publicUrl} target="_blank" rel="noopener noreferrer" variant="secondary">
              <ExternalIcon className="h-4 w-4" />
              Open Page
            </ButtonLink>
          </div>
        </div>

        <LivePreview url={project.publicUrl} />

        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-3">
          {details.map((item) => (
            <div
              key={item.label}
              className="min-w-0 bg-surface p-3.5"
            >
              <dt className="text-[11px] font-medium uppercase tracking-[0.06em] text-fg-subtle">{item.label}</dt>
              <dd className="mt-1 flex items-center gap-1">
                <span
                  className={`truncate text-sm text-fg ${item.mono ? "font-mono text-[13px]" : ""}`}
                  title={item.value}
                >
                  {item.value}
                </span>
                {item.copy && (
                  <span className="-my-1.5">
                    <CopyButton value={item.value} label={`Copy ${item.label}`} />
                  </span>
                )}
              </dd>
            </div>
          ))}
        </dl>

        {project.warnings.length > 0 && (
          <div className="rounded-xl border border-warning/25 bg-warning-soft px-4 py-3.5">
            <p className="flex items-center gap-2 text-sm font-semibold text-fg">
              <WarningIcon className="h-4 w-4 text-warning" />
              {project.warnings.length} warning{project.warnings.length === 1 ? "" : "s"}
            </p>
            <ul className="mt-2 space-y-1 pl-6 text-[13px] text-fg-muted">
              {project.warnings.map((warning) => (
                <li key={warning} className="list-disc marker:text-warning">
                  {warning}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Panel>
  );
}
