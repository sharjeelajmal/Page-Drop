import "server-only";

import { createHash } from "node:crypto";

import { LEGACY_ROUTE_PREFIX } from "@/lib/config";
import { getFileType } from "@/lib/files/mime";
import { dirname, normalizeRequestPath } from "@/lib/files/paths";
import { isValidSlug } from "@/lib/ids";
import { trackPageView } from "@/lib/analytics/track";
import { fetchImmutable, getPublishedSite } from "@/lib/publish/cache";
import { rewriteCss, rewriteHtml } from "@/lib/publish/rewrite";
import { PublishedSite, type SiteFile } from "@/lib/publish/site";
import { publicBasePath } from "@/lib/urls";

/**
 * Serves a published project as a standalone static site. Uploaded HTML is
 * never rendered through React; it is streamed back as its own document.
 */
export async function servePublishedPath(
  request: Request,
  slug: string,
  segments: string[],
): Promise<Response> {
  const { pathname, search } = new URL(request.url);

  if (!isValidSlug(slug)) return messagePage(404, "Page not found", "This page does not exist.");

  // Relative links (./style.css) only resolve correctly under /<slug>/.
  if (segments.length === 0 && !pathname.endsWith("/")) {
    return redirect(`${pathname}/${search}`, 308);
  }

  const path = normalizeRequestPath(segments);
  if (path === null) return messagePage(400, "Bad request", "Invalid path.");

  const project = await getPublishedSite(slug);

  if (!project) return messagePage(404, "Page not found", "This page does not exist or was removed.");
  if (project.status === "processing") {
    return messagePage(503, "Almost there", "This page is still being published. Try again in a moment.");
  }
  if (project.status !== "ready") {
    return messagePage(404, "Page unavailable", "This page could not be published.");
  }

  // Public links are /<slug>/ (rewritten to this route); old /p/<slug>/ links still work.
  const legacyPrefix = `${LEGACY_ROUTE_PREFIX}/${project.slug}`;
  const usesLegacyUrl = pathname === legacyPrefix || pathname.startsWith(`${legacyPrefix}/`);
  const site = new PublishedSite({
    slug: project.slug,
    basePath: usesLegacyUrl ? `${legacyPrefix}/` : publicBasePath(project.slug),
    entryFile: project.entryFile,
    files: project.files,
    assets: project.assets,
  });

  const resolution = site.resolveRequest(path, pathname.endsWith("/"));
  // Count real page loads (HTML documents), not their CSS/JS/images.
  if (resolution.type === "file" && resolution.status === 200 && getFileType(resolution.file.path)?.kind === "html") {
    trackPageView(request, project, resolution.file.path === project.entryFile ? "" : resolution.file.path);
  }
  switch (resolution.type) {
    case "redirect":
      return redirect(resolution.location, resolution.status);
    case "not-found":
      return messagePage(404, "Not found", "The requested file is not part of this page.");
    case "file":
      return serveFile(request, site, project.version, resolution.file, resolution.status);
  }
}

/** Files up to this size are served from the in-memory cache instead of streamed. */
const BUFFERED_MAX_BYTES = 2 * 1024 * 1024;

async function serveFile(
  request: Request,
  site: PublishedSite,
  siteVersion: string,
  file: SiteFile,
  status: number,
): Promise<Response> {
  // Images live on Cloudinary's CDN; send the browser there directly.
  if (file.resourceType === "image") return redirect(file.cloudinaryUrl, 302);

  const kind = getFileType(file.path)?.kind;
  const rewritten = kind === "html" || kind === "css";
  const isDocument = kind === "html";

  // HTML/CSS output also depends on assets (rewritten URLs), so their ETag
  // includes the site version; other files only change with their own URL.
  const etag = `"${createHash("sha1")
    .update(rewritten ? `${file.cloudinaryUrl}|${siteVersion}|${site.basePath}` : file.cloudinaryUrl)
    .digest("base64url")}"`;
  if (status === 200 && request.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers: baseHeaders(file, etag, isDocument) });
  }

  if (rewritten) {
    const upstream = await fetchImmutable(file.cloudinaryUrl);
    if ("status" in upstream) return upstreamError(upstream.status);

    const bytes = upstream.data;
    const text = decodeUtf8(bytes);
    const fromDir = dirname(file.path);
    const rewrite = (ref: string) => site.rewriteReference(ref, fromDir);

    const headers = baseHeaders(file, etag, isDocument);
    // Pages that aren't UTF-8 are served byte-for-byte so their own <meta charset> applies.
    let body: BodyInit = bytes as Uint8Array<ArrayBuffer>;
    if (text !== null) {
      body = isDocument ? rewriteHtml(text, rewrite) : rewriteCss(text, rewrite);
    } else {
      headers.set("Content-Type", file.contentType.replace(/;\s*charset=utf-8/i, ""));
    }
    return new Response(body, { status, headers });
  }

  const range = request.headers.get("range");
  if (!range && file.bytes <= BUFFERED_MAX_BYTES) {
    const upstream = await fetchImmutable(file.cloudinaryUrl);
    if ("status" in upstream) return upstreamError(upstream.status);
    const headers = baseHeaders(file, etag, false);
    headers.set("Content-Length", String(upstream.data.byteLength));
    return new Response(upstream.data as Uint8Array<ArrayBuffer>, { status, headers });
  }

  // Large files and media ranges are streamed through unchanged.
  const upstream = await fetch(file.cloudinaryUrl, {
    cache: "no-store",
    headers: range ? { range } : undefined,
  });
  if (!upstream.ok) return upstreamError(upstream.status);

  const headers = baseHeaders(file, etag, false);
  for (const name of ["content-length", "content-range", "accept-ranges"]) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  return new Response(upstream.body, {
    status: upstream.status === 206 ? 206 : status,
    headers,
  });
}

/**
 * Every response from a published project carries the CSP sandbox, not just
 * HTML: an uploaded .xml/.svg (or any file opened directly) would otherwise
 * run script on this origin. With the sandbox and no allow-same-origin, page
 * scripts run in an opaque origin and cannot read this app's cookies or call
 * its APIs. Browsers ignore this header on subresources (CSS, JS, fonts), so
 * it only takes effect when a file is opened as a document.
 */
const SANDBOX_POLICY =
  "sandbox allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-downloads allow-pointer-lock allow-presentation allow-orientation-lock";

function baseHeaders(file: SiteFile, etag: string, isDocument: boolean): Headers {
  return new Headers({
    "Content-Type": file.contentType,
    // Documents revalidate every time (cheap 304s) so redeploys show at once;
    // other files can be reused briefly and refreshed in the background.
    "Cache-Control": isDocument
      ? "public, max-age=0, must-revalidate"
      : "public, max-age=300, stale-while-revalidate=86400",
    ETag: etag,
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": SANDBOX_POLICY,
    "Referrer-Policy": "strict-origin-when-cross-origin",
    // Sandboxed documents have an opaque origin, so module scripts, fonts
    // and fetch() calls to the page's own files are cross-origin requests.
    "Access-Control-Allow-Origin": "*",
  });
}

function decodeUtf8(bytes: Uint8Array): string | null {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

function redirect(location: string, status: number): Response {
  return new Response(null, {
    status,
    headers: { Location: location, "Cache-Control": "public, max-age=60", "Content-Security-Policy": SANDBOX_POLICY },
  });
}

function upstreamError(upstreamStatus: number): Response {
  console.error(`[pages] Cloudinary responded with ${upstreamStatus}`);
  return messagePage(502, "Temporarily unavailable", "This file could not be loaded. Please try again.");
}

function messagePage(status: number, title: string, message: string): Response {
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>${title}</title>
<style>
  :root{color-scheme:light dark}
  body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;background:#fafafa;color:#18181b}
  @media (prefers-color-scheme:dark){body{background:#09090b;color:#e4e4e7}}
  main{text-align:center;padding:24px}
  .code{font-family:ui-monospace,monospace;font-size:13px;opacity:.55;letter-spacing:.08em}
  h1{font-size:22px;margin:8px 0}
  p{margin:0;opacity:.7}
</style></head>
<body><main><div class="code">${status}</div><h1>${title}</h1><p>${message}</p></main></body></html>`;
  return new Response(html, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": SANDBOX_POLICY,
    },
  });
}
