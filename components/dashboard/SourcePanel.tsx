"use client";

import type { ReactNode } from "react";

import { ProjectLinkField } from "@/components/dashboard/ProjectLinkField";
import { FileCode2, FolderTree, FolderUp, Lock, LockOpen, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { IconTile } from "@/components/ui/IconTile";
import { Switch } from "@/components/ui/Switch";
import { Tilt } from "@/components/ui/Tilt";
import { Dropzone } from "@/components/ui/Dropzone";
import {
  AlertIcon,
  ArchiveIcon,
  CheckIcon,
  FileCodeIcon,
  SpinnerIcon,
  UploadIcon,
} from "@/components/ui/icons";
import { Panel } from "@/components/ui/Panel";
import { ProgressBar } from "@/components/ui/ProgressBar";
import type { ProjectUploadState } from "@/hooks/useProjectUpload";
import { useSlugAvailability } from "@/hooks/useSlugAvailability";
import { PROJECT_ACCEPT } from "@/lib/client/validation";
import { LIMITS, formatBytes } from "@/lib/config";

type SourceState = Exclude<ProjectUploadState, { phase: "ready" }>;

interface SourcePanelProps {
  state: SourceState;
  onFile: (file: File) => void;
  /** Chosen link (site-url/<slug>); empty means a random one. */
  slug: string;
  onSlugChange: (slug: string) => void;
  /** Only for the private account: whether the new project goes into the locked vault. */
  lock?: { value: boolean; onChange: (value: boolean) => void };
}

export function SourcePanel(props: SourcePanelProps) {
  const { state } = props;
  const busy = state.phase === "uploading" || state.phase === "processing";

  return (
    <Panel
      title="Source"
      description="A single HTML file or a ZIP archive of a static site"
      icon={<FolderUp />}
      meta={busy ? <Badge tone="primary" dot>Deploying</Badge> : undefined}
    >
      {busy ? <DeployProgress state={state} /> : <SourcePicker {...props} />}
    </Panel>
  );
}

function SourcePicker({ state, onFile, slug, onSlugChange, lock }: SourcePanelProps) {
  const link = useSlugAvailability(slug);
  const blocked = link.status === "invalid" || link.status === "taken" || link.status === "checking";

  return (
    <div className="space-y-5 animate-fade-in">
      {state.phase === "error" && (
        <div
          role="alert"
          className="flex gap-3 rounded-xl border border-danger/25 bg-danger-soft px-4 py-3.5"
        >
          <AlertIcon className="mt-0.5 h-[18px] w-[18px] shrink-0 text-danger" />
          <div className="min-w-0 text-sm">
            <p className="font-semibold text-fg">
              Deployment failed
              {state.fileName && (
                <span className="ml-2 font-mono text-xs font-normal text-fg-muted">{state.fileName}</span>
              )}
            </p>
            <p className="mt-1 text-fg-muted">{state.message}</p>
          </div>
        </div>
      )}

      <ProjectLinkField value={slug} onChange={onSlugChange} status={link.status} reason={link.reason} />

      {lock && (
        <div
          className={`flex items-center gap-3.5 rounded-2xl border px-4 py-3 transition-colors duration-300 ${
            lock.value ? "border-violet-400/40 bg-violet-500/[0.07]" : "border-border bg-bg-subtle"
          }`}
        >
          <IconTile tone={lock.value ? "violet" : "slate"} size="sm">
            {lock.value ? <Lock /> : <LockOpen />}
          </IconTile>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-fg">Lock this project</p>
            <p className="text-xs text-fg-subtle">
              {lock.value
                ? "Only your private login will see it. Hidden from the admin account."
                : "Visible to both logins."}
            </p>
          </div>
          <Switch checked={lock.value} onChange={lock.onChange} label="Lock this project" />
        </div>
      )}

      <Dropzone
        title={blocked && link.status !== "checking" ? "Fix the project link first" : "Drop HTML or ZIP here"}
        buttonLabel="Choose File"
        accept={PROJECT_ACCEPT}
        disabled={blocked}
        icon={<UploadIcon className="h-6 w-6" />}
        onFiles={([file]) => onFile(file)}
        hint={
          <span className="flex flex-wrap items-center justify-center gap-1.5">
            <Badge mono>.html</Badge>
            <span>up to {formatBytes(LIMITS.maxHtmlBytes)}</span>
            <span className="text-border-strong">•</span>
            <Badge mono>.zip</Badge>
            <span>up to {formatBytes(LIMITS.maxZipBytes)}</span>
          </span>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Feature icon={<FileCode2 />} tone="sky" title="index.html entry">
          ZIPs need an index.html. A wrapping root folder is detected automatically.
        </Feature>
        <Feature icon={<FolderTree />} tone="violet" title="Paths preserved">
          Folder structure and relative links like ./assets/logo.png keep working.
        </Feature>
        <Feature icon={<ShieldCheck />} tone="emerald" title="Isolated & static">
          Only static files are published. Pages run in a sandbox.
        </Feature>
      </div>
    </div>
  );
}

function Feature({
  icon,
  tone,
  title,
  children,
}: {
  icon: ReactNode;
  tone: "sky" | "violet" | "emerald";
  title: string;
  children: ReactNode;
}) {
  return (
    <Tilt max={8} className="depth-1 rounded-2xl border border-border bg-surface/70 p-4">
      <IconTile tone={tone} size="sm">
        {icon}
      </IconTile>
      <p className="mt-3 text-[13px] font-semibold text-fg">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-fg-subtle">{children}</p>
    </Tilt>
  );
}

type BusyState = Extract<SourceState, { phase: "uploading" | "processing" }>;

function DeployProgress({ state }: { state: BusyState }) {
  const uploading = state.phase === "uploading";
  const isZip = state.fileName.toLowerCase().endsWith(".zip");
  const percent = uploading ? Math.round(state.progress * 100) : 100;

  return (
    <div className="space-y-5 animate-fade-in" aria-live="polite">
      <div className="flex items-center gap-4 rounded-xl border border-border bg-bg-subtle p-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-primary shadow-card">
          {isZip ? <ArchiveIcon className="h-5 w-5" /> : <FileCodeIcon className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="truncate font-mono text-sm font-medium text-fg">{state.fileName}</p>
            <span className="shrink-0 font-mono text-xs tabular-nums text-fg-subtle">{percent}%</span>
          </div>
          <p className="mt-0.5 text-xs text-fg-subtle">
            {formatBytes(state.fileSize)} · {isZip ? "ZIP archive" : "HTML document"}
          </p>
          <ProgressBar value={uploading ? state.progress : undefined} className="mt-2.5" />
        </div>
      </div>

      <ol className="space-y-0.5">
        <LogStep
          state={uploading ? "active" : "done"}
          title="Upload"
          detail={uploading ? `Sending file · ${percent}%` : "File received"}
        />
        <LogStep
          state={uploading ? "pending" : "active"}
          title="Build"
          detail={isZip ? "Validating, extracting and publishing files" : "Validating and publishing the page"}
        />
        <LogStep state="pending" title="Live URL" detail="Generating a unique public link" />
      </ol>
    </div>
  );
}

function LogStep({
  state,
  title,
  detail,
}: {
  state: "pending" | "active" | "done";
  title: string;
  detail: string;
}) {
  return (
    <li className="flex items-center gap-3 rounded-lg px-2 py-2">
      <span className="flex h-5 w-5 items-center justify-center">
        {state === "done" && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-fg">
            <CheckIcon className="h-3 w-3" strokeWidth={3} />
          </span>
        )}
        {state === "active" && <SpinnerIcon className="h-[18px] w-[18px] text-primary" />}
        {state === "pending" && <span className="h-2 w-2 rounded-full bg-border-strong" />}
      </span>
      <span className={`text-sm font-medium ${state === "pending" ? "text-fg-subtle" : "text-fg"}`}>{title}</span>
      <span className="truncate text-xs text-fg-subtle">{detail}</span>
    </li>
  );
}
