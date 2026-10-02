"use client";

import { Button, ButtonLink } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import {
  AlertIcon,
  CheckIcon,
  ExternalIcon,
  ImageIcon,
  RetryIcon,
  SpinnerIcon,
  TrashIcon,
} from "@/components/ui/icons";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { useTweenedNumber } from "@/hooks/useTweenedNumber";
import type { AssetItem } from "@/lib/client/asset-uploads";
import { formatBytes } from "@/lib/config";

interface AssetListProps {
  items: AssetItem[];
  onRemove: (localId: string) => void;
  onRetry: (localId: string) => void;
}

export function AssetList({ items, onRemove, onRetry }: AssetListProps) {
  return (
    <ul className="space-y-2.5">
      {items.map((item) => (
        <AssetRow key={item.localId} item={item} onRemove={onRemove} onRetry={onRetry} />
      ))}
    </ul>
  );
}

type Phase = "queued" | "uploading" | "processing" | "done" | "removing" | "error";

function phaseOf(item: AssetItem): Phase {
  if (item.status === "uploading") return item.progress >= 1 ? "processing" : "uploading";
  if (item.status === "uploaded") return "done";
  return item.status;
}

function AssetRow({ item, onRemove, onRetry }: { item: AssetItem } & Omit<AssetListProps, "items">) {
  const phase = phaseOf(item);
  const busy = phase === "uploading" || phase === "processing" || phase === "removing";

  return (
    <li
      className={[
        "group relative overflow-hidden rounded-xl border p-2.5 transition-[border-color,background-color,opacity] duration-300",
        phase === "error" ? "animate-shake" : "animate-slide-up",
        phase === "error"
          ? "border-danger/30 bg-danger-soft"
          : phase === "uploading" || phase === "processing"
            ? "border-primary/30 bg-surface"
            : "border-border bg-surface hover:border-border-strong",
        phase === "removing" ? "opacity-50" : "",
      ].join(" ")}
    >
      {(phase === "uploading" || phase === "processing") && <UploadFill progress={item.progress} />}

      <div className="relative flex items-center gap-3">
        <Thumbnail item={item} phase={phase} />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="min-w-0 truncate text-[13px] font-medium text-fg" title={item.name}>
              {item.name}
            </p>
            <StatusChip phase={phase} />
          </div>
          <Details item={item} phase={phase} />
        </div>

        <div className="flex shrink-0 items-center opacity-80 transition-opacity group-hover:opacity-100">
          {phase === "error" && item.canRetry && (
            <Button variant="ghost" size="icon" onClick={() => onRetry(item.localId)} aria-label={`Retry ${item.name}`} title="Retry">
              <RetryIcon className="h-4 w-4" />
            </Button>
          )}
          {item.asset && phase === "done" && (
            <>
              <CopyButton value={item.asset.cloudinaryUrl} label="Copy Cloudinary URL" />
              <ButtonLink
                href={item.asset.cloudinaryUrl}
                target="_blank"
                rel="noopener noreferrer"
                variant="ghost"
                size="icon"
                aria-label={`Open ${item.name} in Cloudinary`}
                title="Open in Cloudinary"
              >
                <ExternalIcon className="h-4 w-4" />
              </ButtonLink>
            </>
          )}
          <Button
            variant="danger"
            size="icon"
            disabled={busy}
            onClick={() => onRemove(item.localId)}
            aria-label={`Remove ${item.name}`}
            title={item.asset ? "Delete from Cloudinary" : "Remove"}
          >
            {phase === "removing" ? <SpinnerIcon className="h-4 w-4" /> : <TrashIcon className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </li>
  );
}

/** Soft background wash that fills the row as the upload progresses. */
function UploadFill({ progress }: { progress: number }) {
  const tweened = useTweenedNumber(progress);
  return (
    <div
      aria-hidden="true"
      className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary-soft to-primary/15"
      style={{ width: `${tweened * 100}%` }}
    />
  );
}

function Thumbnail({ item, phase }: { item: AssetItem; phase: Phase }) {
  const pending = phase === "queued" || phase === "uploading" || phase === "processing";

  return (
    <div className="relative h-14 w-14 shrink-0">
      <div className="bg-checker relative h-full w-full overflow-hidden rounded-xl border border-border">
        <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
          <ImageIcon className="h-5 w-5 text-fg-subtle" />
        </div>
        {item.previewUrl && (
          // Previews are blob: or Cloudinary URLs; next/image adds nothing here.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.previewUrl}
            alt=""
            // Not a decodable image (e.g. a rejected file): reveal the placeholder icon.
            onError={(event) => {
              event.currentTarget.style.visibility = "hidden";
            }}
            className={`bg-checker relative h-full w-full object-contain p-1 transition-[filter,opacity] duration-500 ${
              pending ? "opacity-70 blur-[1.5px]" : phase === "done" ? "animate-reveal-image" : ""
            }`}
          />
        )}
      </div>

      {(phase === "uploading" || phase === "processing" || phase === "queued") && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/45 backdrop-blur-[1px] animate-fade-in">
          {phase === "uploading" && <ProgressRing value={item.progress} size={38} />}
          {phase === "processing" && <SpinnerIcon className="h-6 w-6 text-white" />}
          {phase === "queued" && <span className="h-2 w-2 animate-soft-pulse rounded-full bg-white" />}
        </div>
      )}

      {phase === "done" && (
        <span className="absolute -right-1.5 -bottom-1.5 flex h-5 w-5 animate-pop-in items-center justify-center rounded-full bg-success text-white ring-2 ring-surface">
          <CheckIcon className="h-3 w-3" strokeWidth={3.5} />
        </span>
      )}
      {phase === "error" && (
        <span className="absolute -right-1.5 -bottom-1.5 flex h-5 w-5 animate-pop-in items-center justify-center rounded-full bg-danger text-white ring-2 ring-surface">
          <AlertIcon className="h-3 w-3" strokeWidth={2.75} />
        </span>
      )}
    </div>
  );
}

const CHIPS: Record<Phase, { label: string; className: string }> = {
  queued: { label: "Queued", className: "border-border bg-surface-2 text-fg-subtle" },
  uploading: { label: "Uploading", className: "border-primary/25 bg-primary-soft text-primary" },
  processing: { label: "Processing", className: "border-primary/25 bg-primary-soft text-primary" },
  done: { label: "Uploaded", className: "border-success/25 bg-success-soft text-success" },
  removing: { label: "Deleting", className: "border-border bg-surface-2 text-fg-subtle" },
  error: { label: "Failed", className: "border-danger/25 bg-danger-soft text-danger" },
};

function StatusChip({ phase }: { phase: Phase }) {
  const chip = CHIPS[phase];
  return (
    <span
      key={phase}
      className={`inline-flex shrink-0 animate-pop-in items-center rounded-full border px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide ${chip.className}`}
    >
      {chip.label}
    </span>
  );
}

function Details({ item, phase }: { item: AssetItem; phase: Phase }) {
  switch (phase) {
    case "uploading":
    case "processing":
      return <UploadDetails item={item} processing={phase === "processing"} />;
    case "queued":
      return <p className="mt-1 text-xs text-fg-subtle">{formatBytes(item.size)} · Waiting for the project to deploy</p>;
    case "removing":
      return <p className="mt-1 text-xs text-fg-subtle">Removing from Cloudinary…</p>;
    case "error":
      return <p className="mt-1 line-clamp-2 text-xs text-danger">{item.error}</p>;
    case "done": {
      const extension = item.name.split(".").pop()?.toUpperCase();
      const meta = [formatBytes(item.size)];
      if (item.asset?.width && item.asset.height) meta.push(`${item.asset.width}×${item.asset.height}`);
      if (extension) meta.push(extension);
      return (
        <div className="mt-1 space-y-0.5">
          <p className="truncate text-xs tabular-nums text-fg-subtle">{meta.join(" · ")}</p>
          {item.error && <p className="text-xs text-danger">{item.error}</p>}
        </div>
      );
    }
  }
}

function UploadDetails({ item, processing }: { item: AssetItem; processing: boolean }) {
  const tweened = useTweenedNumber(item.progress);
  const percent = Math.round(tweened * 100);

  return (
    <div className="mt-1.5 space-y-1.5">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="truncate tabular-nums text-fg-subtle">
          {processing
            ? "Saving to Cloudinary…"
            : `${formatBytes(Math.round(item.size * tweened))} of ${formatBytes(item.size)}`}
        </span>
        <span className="shrink-0 font-mono text-[11px] font-semibold tabular-nums text-primary">
          {percent}%
        </span>
      </div>
      <ProgressBar value={processing ? undefined : item.progress} />
    </div>
  );
}
