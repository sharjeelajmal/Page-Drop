import "server-only";

import { LEGACY_ROUTE_PREFIX } from "@/lib/config";
import { connectToDatabase } from "@/lib/db/mongodb";
import { getFileType } from "@/lib/files/mime";
import { dirname, normalizeRequestPath } from "@/lib/files/paths";
import { isValidSlug } from "@/lib/ids";
import { Project, type AssetRecord } from "@/lib/models/Project";
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

  await connectToDatabase();
  const project = await Project.findOne(
    { slug },
    { slug: 1, status: 1, entryFile: 1, files: 1, assets: 1 },
  ).lean();

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
    assets: project.assets as AssetRecord[],
  });

  const resolution = site.resolveRequest(path, pathname.endsWith("/"));
  switch (resolution.type) {
    case "redirect":
      return redirect(resolution.location, resolution.status);
    case "not-found":
      return messagePage(404, "Not found", "The requested file is not part of this page.");
    case "file":
      return serveFile(request, site, resolution.file, resolution.status);
  }
}

async function serveFile(
  request: Request,
  site: PublishedSite,
  file: SiteFile,
  status: number,
): Promise<Response> {
  // Images live on Cloudinary's CDN; send the browser there directly.
  if (file.resourceType === "image") return redirect(file.cloudinaryUrl, 302);

  const kind = getFileType(file.path)?.kind;

  if (kind === "html" || kind === "css") {
    // Versioned Cloudinary URLs are immutable, so the fetch can be cached.
    const upstream = await fetch(file.cloudinaryUrl, { cache: "force-cache" });
    if (!upstream.ok) return upstreamError(upstream.status);

    const bytes = new Uint8Array(await upstream.arrayBuffer());
    const text = decodeUtf8(bytes);
    const fromDir = dirname(file.path);
    const rewrite = (ref: string) => site.rewriteReference(ref, fromDir);

    const headers = baseHeaders(file);
    // Pages that aren't UTF-8 are served byte-for-byte so their own <meta charset> applies.
    let body: BodyInit = bytes;
    if (text !== null) {
      body = kind === "html" ? rewriteHtml(text, rewrite) : rewriteCss(text, rewrite);
    } else {
      headers.set("Content-Type", file.contentType.replace(/;\s*charset=utf-8/i, ""));
    }
    if (kind === "html") applyDocumentHeaders(headers);
    return new Response(body, { status, headers });
  }

  // Everything else is streamed through unchanged, with Range support for media.
  const range = request.headers.get("range");
  const upstream = await fetch(file.cloudinaryUrl, {
    cache: "no-store",
    headers: range ? { range } : undefined,
  });
  if (!upstream.ok) return upstreamError(upstream.status);

  const headers = baseHeaders(file);
  for (const name of ["content-length", "content-range", "accept-ranges", "etag", "last-modified"]) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  return new Response(upstream.body, {
    status: upstream.status === 206 ? 206 : status,
    headers,
  });
}

function baseHeaders(file: SiteFile): Headers {
  return new Headers({
    "Content-Type": file.contentType,
    "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
    "X-Content-Type-Options": "nosniff",
    // Sandboxed documents have an opaque origin, so module scripts, fonts
    // and fetch() calls to the page's own files are cross-origin requests.
    "Access-Control-Allow-Origin": "*",
  });
}

/**
 * Isolates uploaded documents from the dashboard: with a CSP sandbox and no
 * allow-same-origin, page scripts run in an opaque origin and cannot read
 * this app's cookies/storage or call its APIs with credentials.
 */
function applyDocumentHeaders(headers: Headers) {
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set(
    "Content-Security-Policy",
    "sandbox allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-downloads allow-pointer-lock allow-presentation allow-orientation-lock",
  );
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
    headers: { Location: location, "Cache-Control": "public, max-age=60" },
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
    },
  });
}
