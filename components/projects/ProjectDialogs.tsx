"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Dropzone } from "@/components/ui/Dropzone";
import { AlertIcon, PencilIcon, RetryIcon, SpinnerIcon, TrashIcon, UploadIcon } from "@/components/ui/icons";
import { Modal } from "@/components/ui/Modal";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useToast } from "@/components/ui/Toaster";
import { getErrorMessage } from "@/lib/client/api";
import { deleteProject, redeployProject, renameProject } from "@/lib/client/projects";
import { PROJECT_ACCEPT, validateProjectFile } from "@/lib/client/validation";
import { formatBytes } from "@/lib/config";
import type { ProjectDTO, ProjectSummaryDTO } from "@/types/project";

interface DialogProps {
  project: ProjectSummaryDTO | null;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Rename
// ---------------------------------------------------------------------------

export function RenameDialog({ project, onClose, onRenamed }: DialogProps & { onRenamed: (p: ProjectDTO) => void }) {
  return (
    <Modal
      open={project !== null}
      onClose={onClose}
      title="Rename project"
      description="The public URL stays the same."
      icon={<PencilIcon className="h-5 w-5" />}
    >
      {/* Keyed so the form resets for each project. */}
      {project && <RenameForm key={project.projectId} project={project} onClose={onClose} onRenamed={onRenamed} />}
    </Modal>
  );
}

function RenameForm({
  project,
  onClose,
  onRenamed,
}: {
  project: ProjectSummaryDTO;
  onClose: () => void;
  onRenamed: (p: ProjectDTO) => void;
}) {
  const toast = useToast();
  const [name, setName] = useState(project.name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trimmed = name.trim();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!trimmed || trimmed === project.name) return onClose();
    setBusy(true);
    setError(null);
    try {
      const updated = await renameProject(project.projectId, trimmed);
      onRenamed(updated);
      toast.success(`Renamed to “${updated.name}”`);
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="rounded-xl border border-border bg-bg-subtle transition-[border-color,box-shadow] focus-within:border-primary focus-within:ring-4 focus-within:ring-primary-soft">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={120}
          aria-label="Project name"
          className="h-11 w-full bg-transparent px-3.5 text-sm text-fg outline-none"
        />
      </div>
      {error && <InlineError message={error} />}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" size="sm" disabled={busy || !trimmed}>
          {busy && <SpinnerIcon className="h-4 w-4" />}
          Save
        </Button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

export function DeleteDialog({ project, onClose, onDeleted }: DialogProps & { onDeleted: (projectId: string) => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    if (busy) return;
    setError(null);
    onClose();
  };

  const confirm = async () => {
    if (!project) return;
    setBusy(true);
    setError(null);
    try {
      await deleteProject(project.projectId);
      onDeleted(project.projectId);
      toast.success(`Deleted “${project.name}”`);
      setBusy(false);
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
      setBusy(false);
    }
  };

  return (
    <Modal
      open={project !== null}
      onClose={close}
      tone="danger"
      title="Delete project?"
      icon={<TrashIcon className="h-5 w-5" />}
      description={
        project && (
          <>
            <span className="font-medium text-fg">{project.name}</span> will be removed permanently.
          </>
        )
      }
    >
      {project && (
        <div className="space-y-4">
          <ul className="space-y-1.5 rounded-xl border border-border bg-bg-subtle px-4 py-3 text-[13px] text-fg-muted">
            <li>
              • {project.fileCount} published {project.fileCount === 1 ? "file is" : "files are"} deleted from
              Cloudinary
            </li>
            {project.assetCount > 0 && (
              <li>
                • {project.assetCount} uploaded {project.assetCount === 1 ? "asset is" : "assets are"} deleted
              </li>
            )}
            <li>
              • <span className="font-mono text-xs">{project.publicUrl.replace(/^https?:\/\//, "")}</span> stops working
            </li>
          </ul>
          {error && <InlineError message={error} />}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={close} disabled={busy}>
              Cancel
            </Button>
            <button
              type="button"
              onClick={confirm}
              disabled={busy}
              className="inline-flex h-8 items-center justify-center gap-2 rounded-lg bg-danger px-3 text-[13px] font-medium text-white transition-[filter,transform] duration-150 hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
            >
              {busy ? <SpinnerIcon className="h-4 w-4" /> : <TrashIcon className="h-4 w-4" />}
              Delete project
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Redeploy
// ---------------------------------------------------------------------------

type RedeployState =
  | { phase: "pick"; error?: string }
  | { phase: "uploading"; file: File; progress: number }
  | { phase: "processing"; file: File };

export function RedeployDialog({ project, onClose, onRedeployed }: DialogProps & { onRedeployed: (p: ProjectDTO) => void }) {
  return (
    <Modal
      open={project !== null}
      onClose={onClose}
      title="Redeploy with new files"
      description={
        project && (
          <>
            Replace the files of <span className="font-medium text-fg">{project.name}</span>. URL, name and assets stay
            the same.
          </>
        )
      }
      icon={<RetryIcon className="h-5 w-5" />}
    >
      {project && <RedeployForm key={project.projectId} project={project} onClose={onClose} onRedeployed={onRedeployed} />}
    </Modal>
  );
}

function RedeployForm({
  project,
  onClose,
  onRedeployed,
}: {
  project: ProjectSummaryDTO;
  onClose: () => void;
  onRedeployed: (p: ProjectDTO) => void;
}) {
  const toast = useToast();
  const [state, setState] = useState<RedeployState>({ phase: "pick" });

  const start = async (file: File) => {
    const invalid = validateProjectFile(file);
    if (invalid) return setState({ phase: "pick", error: invalid });
    setState({ phase: "uploading", file, progress: 0 });
    try {
      const updated = await redeployProject(project.projectId, file, (progress) =>
        setState(progress >= 1 ? { phase: "processing", file } : { phase: "uploading", file, progress }),
      );
      onRedeployed(updated);
      toast.success(`“${updated.name}” redeployed — same URL, new files`);
      onClose();
    } catch (err) {
      setState({ phase: "pick", error: getErrorMessage(err) });
    }
  };

  if (state.phase === "pick") {
    return (
      <div className="space-y-3">
        {state.error && <InlineError message={state.error} />}
        <Dropzone
          size="sm"
          title="Drop HTML or ZIP here"
          buttonLabel="Choose File"
          accept={PROJECT_ACCEPT}
          icon={<UploadIcon className="h-[18px] w-[18px]" />}
          hint=".html or .zip with an index.html"
          onFiles={([file]) => start(file)}
        />
      </div>
    );
  }

  const uploading = state.phase === "uploading";
  return (
    <div className="space-y-3 rounded-xl border border-border bg-bg-subtle p-4 animate-fade-in" aria-live="polite">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="min-w-0 truncate font-mono text-fg">{state.file.name}</span>
        <span className="shrink-0 text-xs text-fg-subtle">{formatBytes(state.file.size)}</span>
      </div>
      <ProgressBar value={uploading ? state.progress : undefined} size="md" />
      <p className="flex items-center gap-2 text-xs text-fg-muted">
        <SpinnerIcon className="h-3.5 w-3.5 text-primary" />
        {uploading ? `Uploading · ${Math.round(state.progress * 100)}%` : "Publishing new files to Cloudinary…"}
      </p>
    </div>
  );
}

function InlineError({ message }: { message: string }) {
  return (
    <p role="alert" className="flex animate-shake items-start gap-2 rounded-lg bg-danger-soft px-3 py-2 text-[13px] text-danger">
      <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
      {message}
    </p>
  );
}
