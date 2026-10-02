import { ASSET_EXTENSIONS, LIMITS, PROJECT_UPLOAD_EXTENSIONS, formatBytes } from "@/lib/config";

/**
 * Client-side pre-checks for instant feedback. The server re-validates
 * everything; these only avoid uploading files that would be rejected.
 */

const extensionOf = (name: string) => {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot).toLowerCase() : "";
};

export function validateProjectFile(file: File): string | null {
  const ext = extensionOf(file.name);
  if (!(PROJECT_UPLOAD_EXTENSIONS as readonly string[]).includes(ext)) {
    return "Unsupported file type. Upload a .html or .zip file.";
  }
  if (file.size === 0) return "The file is empty.";
  const max = ext === ".zip" ? LIMITS.maxZipBytes : LIMITS.maxHtmlBytes;
  if (file.size > max) return `File is too large (max ${formatBytes(max)}).`;
  return null;
}

export function validateAssetFile(file: File): string | null {
  const ext = extensionOf(file.name);
  if (!(ASSET_EXTENSIONS as readonly string[]).includes(ext)) {
    return `Unsupported type. Allowed: ${ASSET_EXTENSIONS.join(", ")}`;
  }
  if (file.size === 0) return "The file is empty.";
  if (file.size > LIMITS.maxAssetBytes) return `Too large (max ${formatBytes(LIMITS.maxAssetBytes)}).`;
  return null;
}

export const PROJECT_ACCEPT = PROJECT_UPLOAD_EXTENSIONS.join(",");
export const ASSET_ACCEPT = ASSET_EXTENSIONS.join(",");
