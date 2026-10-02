import "server-only";

import { SHARED_PUBLIC_ASSETS } from "@/lib/config";
import { getExtension } from "@/lib/files/mime";
import { basename, resolveRelativePath } from "@/lib/files/paths";
import type { AssetRecord, ProjectFileRecord } from "@/lib/models/Project";
import { publicBasePath } from "@/lib/urls";

export type SiteFile = ProjectFileRecord;

export interface SiteSource {
  slug: string;
  /** URL prefix the visitor used, e.g. "/my-page/" (or legacy "/p/my-page/"). */
  basePath?: string;
  entryFile: string;
  files: SiteFile[];
  assets: AssetRecord[];
}

export type Resolution =
  | { type: "file"; file: SiteFile; status: number }
  | { type: "redirect"; location: string; status: 301 | 302 | 308 }
  | { type: "not-found" };

const SCHEME_RE = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;

/**
 * In-memory view of a published project used to answer requests and to
 * rewrite references. Images are matched by file name (case-insensitive) in
 * this order: separately uploaded asset → file in the project → shared
 * asset from the app's /public folder (SHARED_PUBLIC_ASSETS).
 */
export class PublishedSite {
  readonly basePath: string;
  private readonly filesByPath = new Map<string, SiteFile>();
  private readonly filesByLowerPath = new Map<string, SiteFile>();
  private readonly assetsByName = new Map<string, AssetRecord>();
  private static readonly sharedByName = new Map<string, string>(
    SHARED_PUBLIC_ASSETS.map((name) => [name.toLowerCase(), `/${encodeURIComponent(name)}`]),
  );

  constructor(private readonly source: SiteSource) {
    this.basePath = source.basePath ?? publicBasePath(source.slug);
    for (const file of source.files) {
      this.filesByPath.set(file.path, file);
      if (!this.filesByLowerPath.has(file.path.toLowerCase())) {
        this.filesByLowerPath.set(file.path.toLowerCase(), file);
      }
    }
    for (const asset of source.assets) {
      this.assetsByName.set(asset.originalName.toLowerCase(), asset);
    }
  }

  findFile(path: string): SiteFile | undefined {
    return this.filesByPath.get(path) ?? this.filesByLowerPath.get(path.toLowerCase());
  }

  findAsset(path: string): AssetRecord | undefined {
    return this.assetsByName.get(basename(path).toLowerCase());
  }

  /** URL of a shared /public image with this file name, if any. */
  findShared(path: string): string | undefined {
    return PublishedSite.sharedByName.get(basename(path).toLowerCase());
  }

  /** Where an image at `path` is actually hosted (Cloudinary CDN or /public). */
  imageUrlFor(path: string): string | undefined {
    const asset = this.findAsset(path);
    if (asset) return asset.cloudinaryUrl;
    const file = this.findFile(path);
    if (file) return file.resourceType === "image" ? file.cloudinaryUrl : undefined;
    return this.findShared(path);
  }

  /** Maps a request path (relative to /<slug>/) to a response. */
  resolveRequest(path: string, hasTrailingSlash: boolean): Resolution {
    if (path === "") return this.serve(this.findFile(this.source.entryFile));

    if (hasTrailingSlash) {
      const index = this.findFile(`${path}/index.html`) ?? this.findFile(`${path}/index.htm`);
      return index ? this.serve(index) : this.notFound();
    }

    const asset = this.findAsset(path);
    if (asset) return { type: "redirect", location: asset.cloudinaryUrl, status: 302 };

    const file = this.findFile(path);
    if (file) return this.serve(file);

    const shared = this.findShared(path);
    if (shared) return { type: "redirect", location: shared, status: 302 };

    if (!getExtension(path)) {
      // Clean URLs: /about -> about.html, /docs -> docs/ (directory index).
      const page = this.findFile(`${path}.html`);
      if (page) return this.serve(page);
      if (this.findFile(`${path}/index.html`) ?? this.findFile(`${path}/index.htm`)) {
        return { type: "redirect", location: `${this.basePath}${encodePath(path)}/`, status: 308 };
      }
    }
    return this.notFound();
  }

  /**
   * Rewrites a reference found in an HTML/CSS file located in `fromDir`.
   * - Images that live in Cloudinary are pointed straight at the CDN.
   * - Root-relative links ("/css/app.css") are scoped to the project, since
   *   "/" on this host is the dashboard, not the project.
   * Returns null when the reference should be left untouched.
   */
  rewriteReference(rawRef: string, fromDir: string): string | null {
    const ref = rawRef.trim();
    if (!ref || ref.startsWith("#") || ref.startsWith("//") || SCHEME_RE.test(ref)) return null;

    const suffixIndex = ref.search(/[?#]/);
    const pathPart = suffixIndex === -1 ? ref : ref.slice(0, suffixIndex);
    const suffix = suffixIndex === -1 ? "" : ref.slice(suffixIndex);
    const hash = suffix.includes("#") ? suffix.slice(suffix.indexOf("#")) : "";

    let decoded: string;
    try {
      decoded = decodeURI(pathPart);
    } catch {
      return null;
    }

    const isRootRelative = decoded.startsWith("/");
    if (isRootRelative && decoded.startsWith(this.basePath)) return null; // already scoped
    const path = resolveRelativePath(isRootRelative ? "" : fromDir, decoded);
    if (path === null) return null;

    if (path && !pathPart.endsWith("/")) {
      const imageUrl = this.imageUrlFor(path);
      if (imageUrl) return imageUrl + hash;
    }

    if (isRootRelative) {
      const isDir = path === "" || pathPart.endsWith("/");
      const exists = isDir
        ? path === "" || this.findFile(`${path}/index.html`) || this.findFile(`${path}/index.htm`)
        : this.findFile(path) || this.findFile(`${path}.html`);
      if (exists) return `${this.basePath}${encodePath(path)}${isDir && path ? "/" : ""}${suffix}`;
    }
    return null;
  }

  private serve(file: SiteFile | undefined, status = 200): Resolution {
    return file ? { type: "file", file, status } : { type: "not-found" };
  }

  private notFound(): Resolution {
    const custom = this.findFile("404.html");
    return custom ? this.serve(custom, 404) : { type: "not-found" };
  }
}

function encodePath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}
