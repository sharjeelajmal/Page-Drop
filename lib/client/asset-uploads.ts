import { ApiClientError, apiRequest, getErrorMessage, uploadWithProgress } from "@/lib/client/api";
import { validateAssetFile } from "@/lib/client/validation";
import type { AssetDTO } from "@/types/project";

export type AssetItemStatus = "queued" | "uploading" | "uploaded" | "error" | "removing";

export interface AssetItem {
  localId: string;
  name: string;
  size: number;
  previewUrl?: string;
  status: AssetItemStatus;
  progress: number;
  error?: string;
  /** True when the upload failed server-side and can be retried. */
  canRetry?: boolean;
  asset?: AssetDTO;
}

const MAX_PARALLEL_UPLOADS = 3;

/** Network and server failures can succeed on retry; validation errors (4xx) can't. */
const isRetryable = (error: unknown) =>
  !(error instanceof ApiClientError) || error.status === 0 || error.status === 409 || error.status >= 500;

/**
 * Upload queue for project assets, kept outside React and consumed with
 * useSyncExternalStore. Files dropped before a project exists stay queued
 * and start uploading as soon as a project is attached.
 */
export class AssetUploadManager {
  private items: AssetItem[] = [];
  private readonly files = new Map<string, File>();
  private readonly listeners = new Set<() => void>();
  private queue: string[] = [];
  private active = 0;
  private projectId: string | null = null;
  private counter = 0;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = () => this.items;

  /** Attaches the uploader to a published project and starts queued uploads. */
  setProject(projectId: string | null, existingAssets: AssetDTO[] = []) {
    if (projectId !== this.projectId) {
      // Keep files that are still waiting; drop everything tied to the old project.
      const waiting = this.items.filter((item) => item.status === "queued");
      this.items.filter((item) => item.status !== "queued").forEach((item) => this.release(item));
      this.items = [
        ...existingAssets.map((asset) => this.fromAsset(asset)),
        ...waiting,
      ];
      this.queue = waiting.map((item) => item.localId);
      this.projectId = projectId;
      this.emit();
    }
    this.pump();
  }

  addFiles(files: File[]) {
    const added: AssetItem[] = files.map((file) => {
      const localId = `local-${++this.counter}`;
      const error = validateAssetFile(file);
      if (!error) {
        this.files.set(localId, file);
        this.queue.push(localId);
      }
      return {
        localId,
        name: file.name,
        size: file.size,
        previewUrl: error ? undefined : URL.createObjectURL(file),
        status: error ? "error" : "queued",
        progress: 0,
        error: error ?? undefined,
      };
    });
    this.items = [...this.items, ...added];
    this.emit();
    this.pump();
  }

  retry(localId: string) {
    if (!this.files.has(localId)) return;
    this.update(localId, { status: "queued", progress: 0, error: undefined, canRetry: false });
    this.queue.push(localId);
    this.pump();
  }

  async remove(localId: string) {
    const item = this.items.find((i) => i.localId === localId);
    if (!item || item.status === "uploading" || item.status === "removing") return;

    if (item.status === "uploaded" && item.asset && this.projectId) {
      this.update(localId, { status: "removing", error: undefined });
      try {
        await apiRequest(`/api/projects/${this.projectId}/assets/${item.asset.id}`, { method: "DELETE" });
      } catch (error) {
        this.update(localId, { status: "uploaded", error: getErrorMessage(error) });
        return;
      }
    }
    this.queue = this.queue.filter((id) => id !== localId);
    this.release(item);
    this.items = this.items.filter((i) => i.localId !== localId);
    this.emit();
  }

  reset() {
    this.items.forEach((item) => this.release(item));
    this.items = [];
    this.queue = [];
    this.projectId = null;
    this.emit();
  }

  private pump() {
    const projectId = this.projectId;
    if (!projectId) return;

    while (this.active < MAX_PARALLEL_UPLOADS && this.queue.length > 0) {
      const localId = this.queue.shift()!;
      const file = this.files.get(localId);
      if (!file) continue;

      this.active++;
      this.update(localId, { status: "uploading", progress: 0 });
      uploadWithProgress<{ asset: AssetDTO }>(`/api/projects/${projectId}/assets`, file, (progress) =>
        this.update(localId, { progress }),
      )
        .then(({ asset }) => {
          if (projectId !== this.projectId) return;
          // Re-uploading a name replaces the asset server-side; mirror that here.
          const replaced = this.items.filter((i) => i.localId !== localId && i.asset?.id === asset.id);
          replaced.forEach((item) => this.release(item));
          this.items = this.items.filter((i) => !replaced.includes(i));
          this.update(localId, { status: "uploaded", progress: 1, asset });
          this.files.delete(localId);
        })
        .catch((error) =>
          this.update(localId, { status: "error", error: getErrorMessage(error), canRetry: isRetryable(error) }),
        )
        .finally(() => {
          this.active--;
          this.pump();
        });
    }
  }

  private fromAsset(asset: AssetDTO): AssetItem {
    return {
      localId: `asset-${asset.id}`,
      name: asset.originalName,
      size: asset.bytes,
      previewUrl: asset.cloudinaryUrl,
      status: "uploaded",
      progress: 1,
      asset,
    };
  }

  private release(item: AssetItem) {
    if (item.previewUrl?.startsWith("blob:")) URL.revokeObjectURL(item.previewUrl);
    this.files.delete(item.localId);
  }

  private update(localId: string, patch: Partial<AssetItem>) {
    let changed = false;
    this.items = this.items.map((item) => {
      if (item.localId !== localId) return item;
      changed = true;
      return { ...item, ...patch };
    });
    if (changed) this.emit();
  }

  private emit() {
    this.listeners.forEach((listener) => listener());
  }
}
