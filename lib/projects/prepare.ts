import "server-only";

import { LIMITS, formatBytes } from "@/lib/config";
import { badRequest, payloadTooLarge, unsupportedMediaType } from "@/lib/errors";
import { getExtension } from "@/lib/files/mime";
import { cleanUploadedFileName, splitExtension } from "@/lib/files/paths";
import { isZip, looksLikeHtml } from "@/lib/files/signatures";
import { extractZip, type ExtractedFile } from "@/lib/files/zip";
import type { ProjectType } from "@/types/project";

export interface PreparedProject {
  type: ProjectType;
  originalFileName: string;
  name: string;
  entryFile: string;
  files: ExtractedFile[];
  warnings: string[];
}

const HTML_MIME_TYPES = ["", "text/html", "application/xhtml+xml", "application/octet-stream"];
const ZIP_MIME_TYPES = [
  "",
  "application/zip",
  "application/x-zip",
  "application/x-zip-compressed",
  "application/octet-stream",
  "multipart/x-zip",
];

/**
 * Validates an uploaded project file and turns it into the list of files to
 * publish. Throws an AppError with a user-facing message on invalid input.
 */
export async function prepareProjectUpload(file: File): Promise<PreparedProject> {
  const originalFileName = cleanUploadedFileName(file.name);
  const extension = getExtension(originalFileName);
  const mime = (file.type || "").toLowerCase();

  if (extension === ".html" || extension === ".htm") {
    if (!HTML_MIME_TYPES.includes(mime)) {
      throw unsupportedMediaType(`Expected an HTML file but received "${mime}".`);
    }
    if (file.size > LIMITS.maxHtmlBytes) {
      throw payloadTooLarge(`HTML files must be at most ${formatBytes(LIMITS.maxHtmlBytes)}.`);
    }
    const data = new Uint8Array(await file.arrayBuffer());
    if (!looksLikeHtml(data)) {
      throw unsupportedMediaType("The file does not look like a valid HTML document.");
    }
    return {
      type: "html",
      originalFileName,
      name: extractTitle(data) ?? splitExtension(originalFileName)[0],
      entryFile: "index.html",
      files: [{ path: "index.html", data }],
      warnings: [],
    };
  }

  if (extension === ".zip") {
    if (!ZIP_MIME_TYPES.includes(mime)) {
      throw unsupportedMediaType(`Expected a ZIP archive but received "${mime}".`);
    }
    if (file.size > LIMITS.maxZipBytes) {
      throw payloadTooLarge(`ZIP archives must be at most ${formatBytes(LIMITS.maxZipBytes)}.`);
    }
    const data = new Uint8Array(await file.arrayBuffer());
    if (!isZip(data)) {
      throw unsupportedMediaType("The file is not a valid ZIP archive.");
    }
    const archive = extractZip(data);
    const entry = archive.files.find((f) => f.path === archive.entryFile);
    if (!entry || !looksLikeHtml(entry.data)) {
      throw badRequest("invalid_index", `${archive.entryFile} is empty or not a valid HTML document.`);
    }
    return {
      type: "zip",
      originalFileName,
      name: extractTitle(entry.data) ?? splitExtension(originalFileName)[0],
      entryFile: archive.entryFile,
      files: archive.files,
      warnings: archive.warnings,
    };
  }

  throw unsupportedMediaType("Unsupported file type. Upload a .html or .zip file.");
}

function extractTitle(data: Uint8Array): string | undefined {
  const head = new TextDecoder().decode(data.subarray(0, 64 * 1024));
  const match = head.match(/<title[^>]*>([^<]{1,200})<\/title>/i);
  const title = match?.[1]
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  return title || undefined;
}
