import "server-only";

import { connectToDatabase } from "@/lib/db/mongodb";
import { Project, type AssetRecord, type ProjectFileRecord } from "@/lib/models/Project";

/**
 * Hot-path caches for public page serving. A single page view triggers many
 * requests (HTML, CSS, JS, fonts…); without caching each one would query
 * MongoDB and Cloudinary.
 *
 * - Site manifests: short TTL (works across multiple server instances) plus
 *   explicit invalidation on writes in this instance.
 * - File bodies: keyed by the versioned Cloudinary URL, which never changes
 *   content, so entries can live until evicted (LRU, bounded by bytes).
 */

export interface CachedSite {
  projectId: string;
  slug: string;
  status: "processing" | "ready" | "failed";
  entryFile: string;
  files: ProjectFileRecord[];
  assets: AssetRecord[];
  /** Changes whenever served content may change (redeploy, asset edits). */
  version: string;
}

const SITE_TTL_MS = 15_000;
const SITE_MAX_ENTRIES = 500;
const sites = new Map<string, { expires: number; site: CachedSite | null }>();
const inflight = new Map<string, Promise<CachedSite | null>>();

export async function getPublishedSite(slug: string): Promise<CachedSite | null> {
  const hit = sites.get(slug);
  if (hit && hit.expires > Date.now()) return hit.site;

  // Collapse concurrent lookups for the same slug into one query.
  const pending = inflight.get(slug);
  if (pending) return pending;

  const load = (async () => {
    await connectToDatabase();
    const project = await Project.findOne(
      { slug },
      { projectId: 1, slug: 1, status: 1, entryFile: 1, files: 1, assets: 1, updatedAt: 1, revision: 1 },
    ).lean();
    const site: CachedSite | null = project
      ? {
          projectId: project.projectId,
          slug: project.slug,
          status: project.status,
          entryFile: project.entryFile,
          files: project.files,
          assets: project.assets as AssetRecord[],
          version: `${project.revision ?? 0}-${new Date(project.updatedAt ?? 0).getTime()}`,
        }
      : null;
    if (sites.size >= SITE_MAX_ENTRIES) sites.delete(sites.keys().next().value as string);
    sites.set(slug, { expires: Date.now() + SITE_TTL_MS, site });
    return site;
  })().finally(() => inflight.delete(slug));

  inflight.set(slug, load);
  return load;
}

export function invalidateSite(slug: string | undefined | null): void {
  if (slug) sites.delete(slug);
}

// ---------------------------------------------------------------------------
// File bodies
// ---------------------------------------------------------------------------

const FILE_CACHE_MAX_BYTES = 64 * 1024 * 1024;
const FILE_CACHE_MAX_ITEM = 2 * 1024 * 1024;
const files = new Map<string, Uint8Array>();
let fileBytes = 0;

export function getCachedFile(url: string): Uint8Array | undefined {
  const data = files.get(url);
  if (data) {
    // Refresh recency (Map keeps insertion order).
    files.delete(url);
    files.set(url, data);
  }
  return data;
}

export function setCachedFile(url: string, data: Uint8Array): void {
  if (data.byteLength > FILE_CACHE_MAX_ITEM || files.has(url)) return;
  files.set(url, data);
  fileBytes += data.byteLength;
  while (fileBytes > FILE_CACHE_MAX_BYTES) {
    const oldest = files.keys().next().value as string;
    fileBytes -= files.get(oldest)?.byteLength ?? 0;
    files.delete(oldest);
  }
}

/**
 * Fetches an immutable Cloudinary file, served from memory when possible.
 * Returns null on upstream errors (status is reported to the caller).
 */
export async function fetchImmutable(url: string): Promise<{ data: Uint8Array } | { status: number }> {
  const cached = getCachedFile(url);
  if (cached) return { data: cached };
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) return { status: response.status };
  const data = new Uint8Array(await response.arrayBuffer());
  setCachedFile(url, data);
  return { data };
}
