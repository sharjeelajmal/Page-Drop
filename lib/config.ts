/**
 * Upload limits and storage conventions. Shared by server code and the
 * dashboard (for client-side pre-validation), so it must not read secrets.
 */

const MB = 1024 * 1024;

export const LIMITS = {
  /** Max size of a single uploaded .html file. */
  maxHtmlBytes: 5 * MB,
  /** Max size of an uploaded .zip archive. */
  maxZipBytes: 50 * MB,
  /** Max combined uncompressed size of all files kept from a ZIP. */
  maxExtractedBytes: 150 * MB,
  /** Max size of any single file inside a ZIP (Cloudinary free-tier limit). */
  maxFileBytes: 10 * MB,
  /** Max number of entries (including folders/junk) a ZIP may declare. */
  maxZipEntries: 5000,
  /** Max number of files published from one project. */
  maxProjectFiles: 1000,
  /** Max folder depth inside a ZIP. */
  maxPathDepth: 24,
  /** Max length of a path inside a ZIP. */
  maxPathLength: 512,
  /** Max size of a single uploaded asset image. */
  maxAssetBytes: 10 * MB,
  /** Max number of separately uploaded assets per project. */
  maxAssetsPerProject: 100,
} as const;

/** Parallel Cloudinary uploads while publishing a ZIP. */
export const UPLOAD_CONCURRENCY = 6;

/** Root Cloudinary folder. Layout: html-pages/<projectId>/{<asset>, site/<path>} */
export const CLOUDINARY_ROOT_FOLDER = "html-pages";

/**
 * Internal route that serves published projects. Public links are
 * site-url/<slug>; next.config.ts rewrites them here. Old /p/<slug> links
 * keep working too.
 */
export const LEGACY_ROUTE_PREFIX = "/p";

/**
 * Images in the app's /public folder that every project can use by file name
 * without uploading them (e.g. <img src="logo.png"> or url(../img/logo2.png)).
 * Add a name here after dropping the file into /public.
 * Lookup order: project-uploaded asset → file in the project → shared asset.
 */
export const SHARED_PUBLIC_ASSETS = ["logo.png", "logo2.png"] as const;

export const PROJECT_UPLOAD_EXTENSIONS = [".html", ".htm", ".zip"] as const;

export const ASSET_EXTENSIONS = [
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".svg",
  ".gif",
  ".avif",
  ".ico",
] as const;

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < MB) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / MB).toFixed(1)} MB`;
}
