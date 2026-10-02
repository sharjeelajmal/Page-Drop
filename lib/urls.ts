import "server-only";

import { getAppUrl } from "@/lib/env";

/** Path under which a project's files are served, always with a trailing slash. */
export function publicBasePath(slug: string): string {
  return `/${slug}/`;
}

/**
 * Shareable URL for a project. Uses NEXT_PUBLIC_APP_URL when set, otherwise
 * the origin of the current request (localhost in dev, your domain live).
 */
export function buildPublicUrl(slug: string, requestOrigin: string): string {
  const base = getAppUrl() ?? requestOrigin.replace(/\/+$/, "");
  return `${base}/${slug}`;
}
