import { unzipSync, type UnzipFileInfo } from "fflate";

import { LIMITS, formatBytes } from "@/lib/config";
import { AppError, badRequest, payloadTooLarge } from "@/lib/errors";
import { isAllowedProjectFile } from "@/lib/files/mime";
import { basename, dirname, isIgnoredArchivePath, normalizeArchivePath } from "@/lib/files/paths";

export interface ExtractedFile {
  /** Path relative to the detected project root. */
  path: string;
  data: Uint8Array;
}

export interface ExtractedArchive {
  files: ExtractedFile[];
  entryFile: string;
  /** Folder inside the ZIP that was treated as the project root ("" = top level). */
  rootFolder: string;
  warnings: string[];
}

interface Candidate {
  rawName: string;
  path: string;
  size: number;
}

const ENTRY_NAMES = ["index.html", "index.htm"];

/**
 * Safely extracts a static site from a ZIP archive, entirely in memory.
 *
 * - Every entry path is normalized; absolute paths and ".." are rejected.
 * - Declared sizes are checked before inflating, and fflate never inflates
 *   past the declared size, so ZIP bombs cannot exhaust memory.
 * - The shallowest index.html decides the project root, so archives that
 *   wrap everything in a single folder (website/index.html) just work.
 * - Hidden files, OS junk and non-static file types are skipped.
 */
export function extractZip(archive: Uint8Array): ExtractedArchive {
  const entries = readCentralDirectory(archive);
  const warnings: string[] = [];

  const candidates: Candidate[] = [];
  const skippedTypes = new Set<string>();
  let skippedTypeCount = 0;

  for (const entry of entries) {
    if (entry.name.endsWith("/") || entry.name.endsWith("\\")) continue; // folder
    const path = normalizeArchivePath(entry.name);
    if (!path || isIgnoredArchivePath(path)) continue;

    if (!isAllowedProjectFile(path)) {
      skippedTypeCount++;
      skippedTypes.add(basename(path));
      continue;
    }
    if (entry.compression !== 0 && entry.compression !== 8) {
      throw badRequest(
        "unsupported_zip",
        `"${path}" uses an unsupported ZIP compression method. Re-create the ZIP with standard (deflate) compression.`,
      );
    }
    const size = Math.max(entry.originalSize, entry.compression === 0 ? entry.size : 0);
    if (size > LIMITS.maxFileBytes) {
      throw payloadTooLarge(
        `"${path}" is ${formatBytes(size)}; files inside the ZIP must be at most ${formatBytes(LIMITS.maxFileBytes)}.`,
      );
    }
    candidates.push({ rawName: entry.name, path, size });
  }

  if (skippedTypeCount > 0) {
    const examples = [...skippedTypes].slice(0, 5).join(", ");
    warnings.push(
      `Skipped ${skippedTypeCount} unsupported file${skippedTypeCount === 1 ? "" : "s"} (${examples}${skippedTypes.size > 5 ? ", …" : ""}). Only static files are published.`,
    );
  }

  const entry = findEntry(candidates);
  const rootFolder = dirname(entry.path);
  const prefix = rootFolder ? `${rootFolder}/` : "";

  const selected = new Map<string, string>(); // raw ZIP name -> project path
  const seen = new Set<string>();
  let outsideRoot = 0;
  let totalBytes = 0;

  for (const candidate of candidates) {
    if (!candidate.path.startsWith(prefix)) {
      outsideRoot++;
      continue;
    }
    const path = candidate.path.slice(prefix.length);
    const key = path.toLowerCase();
    if (seen.has(key)) {
      warnings.push(`Skipped duplicate file "${path}".`);
      continue;
    }
    seen.add(key);
    totalBytes += candidate.size;
    selected.set(candidate.rawName, path);
  }

  if (outsideRoot > 0) {
    warnings.push(
      `Ignored ${outsideRoot} file${outsideRoot === 1 ? "" : "s"} outside the project folder "${rootFolder}/".`,
    );
  }
  if (selected.size > LIMITS.maxProjectFiles) {
    throw payloadTooLarge(
      `ZIP contains ${selected.size} files; the limit is ${LIMITS.maxProjectFiles}.`,
    );
  }
  if (totalBytes > LIMITS.maxExtractedBytes) {
    throw payloadTooLarge(
      `ZIP expands to ${formatBytes(totalBytes)}; the limit is ${formatBytes(LIMITS.maxExtractedBytes)}.`,
    );
  }

  let unzipped: Record<string, Uint8Array>;
  try {
    unzipped = unzipSync(archive, { filter: (file) => selected.has(file.name) });
  } catch {
    throw badRequest(
      "invalid_zip",
      "The ZIP could not be extracted. It may be corrupted or password-protected.",
    );
  }

  const files: ExtractedFile[] = [];
  for (const [rawName, path] of selected) {
    const data = unzipped[rawName];
    if (data) files.push({ path, data });
  }
  files.sort((a, b) => a.path.localeCompare(b.path));

  return { files, entryFile: entry.path.slice(prefix.length), rootFolder, warnings };
}

function readCentralDirectory(archive: Uint8Array): UnzipFileInfo[] {
  const entries: UnzipFileInfo[] = [];
  try {
    // Returning false from the filter lists entries without inflating anything.
    unzipSync(archive, {
      filter: (file) => {
        entries.push(file);
        if (entries.length > LIMITS.maxZipEntries) {
          throw new AppError(
            413,
            "payload_too_large",
            `ZIP contains more than ${LIMITS.maxZipEntries} entries.`,
          );
        }
        return false;
      },
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw badRequest("invalid_zip", "The uploaded file is not a valid ZIP archive.");
  }
  if (entries.length === 0) {
    throw badRequest("empty_zip", "The ZIP archive is empty.");
  }
  return entries;
}

function findEntry(candidates: Candidate[]): Candidate {
  const indexFiles = candidates.filter((c) =>
    ENTRY_NAMES.includes(basename(c.path).toLowerCase()),
  );
  if (indexFiles.length === 0) {
    throw badRequest(
      "missing_index",
      "No index.html found in the ZIP. Add an index.html file as the entry point of your project.",
    );
  }

  const depth = (c: Candidate) => c.path.split("/").length;
  const minDepth = Math.min(...indexFiles.map(depth));
  const shallowest = indexFiles.filter((c) => depth(c) === minDepth);
  const folders = new Set(shallowest.map((c) => dirname(c.path)));

  if (folders.size > 1) {
    const list = [...folders].slice(0, 3).map((f) => `${f || "."}/`).join(", ");
    throw badRequest(
      "ambiguous_index",
      `Found several index.html files at the same level (${list}). Keep a single project per ZIP.`,
    );
  }
  // Prefer index.html over index.htm in the same folder.
  return (
    shallowest.find((c) => basename(c.path).toLowerCase() === "index.html") ?? shallowest[0]
  );
}
