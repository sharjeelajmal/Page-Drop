/**
 * Allow-list of static file types that may be published from a project.
 * Anything not listed here (server-side scripts, executables, archives, …)
 * is skipped during processing and never served.
 */

export type FileKind =
  | "html"
  | "css"
  | "script"
  | "data"
  | "image"
  | "font"
  | "media"
  | "document";

interface FileTypeInfo {
  mime: string;
  kind: FileKind;
}

const FILE_TYPES: Record<string, FileTypeInfo> = {
  ".html": { mime: "text/html; charset=utf-8", kind: "html" },
  ".htm": { mime: "text/html; charset=utf-8", kind: "html" },
  ".css": { mime: "text/css; charset=utf-8", kind: "css" },
  ".js": { mime: "text/javascript; charset=utf-8", kind: "script" },
  ".mjs": { mime: "text/javascript; charset=utf-8", kind: "script" },
  ".map": { mime: "application/json; charset=utf-8", kind: "data" },
  ".json": { mime: "application/json; charset=utf-8", kind: "data" },
  ".webmanifest": { mime: "application/manifest+json", kind: "data" },
  ".txt": { mime: "text/plain; charset=utf-8", kind: "data" },
  ".md": { mime: "text/markdown; charset=utf-8", kind: "data" },
  ".csv": { mime: "text/csv; charset=utf-8", kind: "data" },
  ".xml": { mime: "application/xml; charset=utf-8", kind: "data" },
  ".png": { mime: "image/png", kind: "image" },
  ".jpg": { mime: "image/jpeg", kind: "image" },
  ".jpeg": { mime: "image/jpeg", kind: "image" },
  ".gif": { mime: "image/gif", kind: "image" },
  ".webp": { mime: "image/webp", kind: "image" },
  ".avif": { mime: "image/avif", kind: "image" },
  ".svg": { mime: "image/svg+xml", kind: "image" },
  ".ico": { mime: "image/x-icon", kind: "image" },
  ".bmp": { mime: "image/bmp", kind: "image" },
  ".woff": { mime: "font/woff", kind: "font" },
  ".woff2": { mime: "font/woff2", kind: "font" },
  ".ttf": { mime: "font/ttf", kind: "font" },
  ".otf": { mime: "font/otf", kind: "font" },
  ".eot": { mime: "application/vnd.ms-fontobject", kind: "font" },
  ".mp4": { mime: "video/mp4", kind: "media" },
  ".webm": { mime: "video/webm", kind: "media" },
  ".mp3": { mime: "audio/mpeg", kind: "media" },
  ".wav": { mime: "audio/wav", kind: "media" },
  ".ogg": { mime: "audio/ogg", kind: "media" },
  ".pdf": { mime: "application/pdf", kind: "document" },
};

export function getExtension(path: string): string {
  const name = path.slice(path.lastIndexOf("/") + 1);
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot).toLowerCase() : "";
}

export function getFileType(path: string): FileTypeInfo | undefined {
  return FILE_TYPES[getExtension(path)];
}

export function isAllowedProjectFile(path: string): boolean {
  return getFileType(path) !== undefined;
}

export function contentTypeFor(path: string): string {
  return getFileType(path)?.mime ?? "application/octet-stream";
}
