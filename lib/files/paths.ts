import { LIMITS } from "@/lib/config";
import { badRequest } from "@/lib/errors";

/**
 * Path helpers for project files. Project paths are always relative,
 * forward-slash separated and never contain "." or ".." segments.
 * Nothing is ever written to the server filesystem; these paths become URL
 * paths and Cloudinary public IDs, so they still have to be strictly safe.
 */

const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;

/**
 * Normalizes a path taken from a ZIP entry. Throws on anything that could
 * escape the project root (absolute paths, drive letters, "..").
 */
export function normalizeArchivePath(raw: string): string {
  const path = raw.replace(/\\/g, "/");

  if (CONTROL_CHARS.test(path)) {
    throw badRequest("unsafe_path", "ZIP contains a file name with control characters.");
  }
  if (path.startsWith("/") || /^[a-zA-Z]:/.test(path)) {
    throw badRequest("unsafe_path", `ZIP contains an absolute path: "${truncate(raw)}".`);
  }

  const segments: string[] = [];
  for (const segment of path.split("/")) {
    if (segment === "" || segment === ".") continue;
    if (segment === "..") {
      throw badRequest(
        "unsafe_path",
        `ZIP contains a path that escapes the project folder: "${truncate(raw)}".`,
      );
    }
    if (segment.length > 255) {
      throw badRequest("unsafe_path", "ZIP contains a file name that is too long.");
    }
    segments.push(segment);
  }

  const normalized = segments.join("/");
  if (segments.length > LIMITS.maxPathDepth || normalized.length > LIMITS.maxPathLength) {
    throw badRequest("unsafe_path", `ZIP contains a path that is too deep or too long.`);
  }
  return normalized;
}

/**
 * Resolves a relative reference against a directory inside the project.
 * Returns null if the reference climbs above the project root.
 */
export function resolveRelativePath(fromDir: string, ref: string): string | null {
  const out = fromDir ? fromDir.split("/") : [];
  for (const segment of ref.split("/")) {
    if (segment === "" || segment === ".") continue;
    if (segment === "..") {
      if (out.length === 0) return null;
      out.pop();
      continue;
    }
    out.push(segment);
  }
  return out.join("/");
}

/** Validates the path segments of an incoming public request. */
export function normalizeRequestPath(segments: string[]): string | null {
  const out: string[] = [];
  for (const segment of segments) {
    if (segment === "" || segment === ".") continue;
    if (segment === ".." || segment.includes("/") || segment.includes("\\")) return null;
    if (CONTROL_CHARS.test(segment)) return null;
    out.push(segment);
  }
  return out.join("/");
}

export function dirname(path: string): string {
  const index = path.lastIndexOf("/");
  return index === -1 ? "" : path.slice(0, index);
}

export function basename(path: string): string {
  return path.slice(path.lastIndexOf("/") + 1);
}

/** Splits "name.ext" into ["name", ".ext"]. Dotfiles have no extension. */
export function splitExtension(name: string): [string, string] {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? [name.slice(0, dot), name.slice(dot)] : [name, ""];
}

/** True for OS junk and hidden files that should never be published. */
export function isIgnoredArchivePath(path: string): boolean {
  return path.split("/").some(
    (segment) =>
      segment === "__MACOSX" ||
      segment.startsWith(".") ||
      segment.toLowerCase() === "thumbs.db" ||
      segment.toLowerCase() === "desktop.ini",
  );
}

/**
 * Cleans a user-supplied file name for display and matching. Strips any
 * directory components and control characters; rejects empty/hidden names.
 */
export function cleanUploadedFileName(raw: string): string {
  const name = basename(raw.replace(/\\/g, "/"))
    .normalize("NFC")
    .replace(new RegExp(CONTROL_CHARS.source, "g"), "")
    .trim();
  if (!name || name.startsWith(".") || name.length > 200) {
    throw badRequest("invalid_file_name", "File name is empty, hidden or too long.");
  }
  return name;
}

/**
 * Converts one path segment into a conservative Cloudinary public ID segment.
 * Characters outside [A-Za-z0-9._-] are replaced with "-".
 */
export function toPublicIdSegment(segment: string): string {
  const cleaned = segment
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 120);
  return cleaned || "file";
}

function truncate(value: string, max = 80): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}
