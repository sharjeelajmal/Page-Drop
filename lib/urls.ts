import "server-only";

import { headers } from "next/headers";

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

/** Origin of the current request, for Server Components (no NextRequest available). */
export async function getServerRequestOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host")?.split(",")[0].trim() || h.get("host") || "localhost";
  const proto = h.get("x-forwarded-proto")?.split(",")[0].trim() || "http";
  return `${proto}://${host}`;
}
