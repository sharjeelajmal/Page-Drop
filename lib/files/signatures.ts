/**
 * Content sniffing helpers. Extensions and browser-supplied MIME types are
 * hints only; these checks look at the actual bytes.
 */

const startsWith = (data: Uint8Array, bytes: number[], offset = 0) =>
  data.length >= offset + bytes.length && bytes.every((b, i) => data[offset + i] === b);

const ascii = (data: Uint8Array, start: number, end: number) =>
  String.fromCharCode(...data.subarray(start, end));

export function isZip(data: Uint8Array): boolean {
  // Local file header, or end-of-central-directory for an empty archive.
  return startsWith(data, [0x50, 0x4b, 0x03, 0x04]) || startsWith(data, [0x50, 0x4b, 0x05, 0x06]);
}

/** Binary files almost always contain NUL bytes near the start. */
export function looksLikeText(data: Uint8Array, sampleSize = 8192): boolean {
  const sample = data.subarray(0, sampleSize);
  return !sample.includes(0);
}

function headText(data: Uint8Array, size = 64 * 1024): string {
  return new TextDecoder("utf-8", { fatal: false }).decode(data.subarray(0, size));
}

export function looksLikeHtml(data: Uint8Array): boolean {
  if (!looksLikeText(data)) return false;
  return /<(?:!doctype\s+html|html|head|body|meta|title|div|main|section|script|style|link|p|h[1-6])[\s>/]/i.test(
    headText(data),
  );
}

export type ImageFormat = "png" | "jpeg" | "gif" | "webp" | "avif" | "ico" | "svg";

export function detectImageFormat(data: Uint8Array): ImageFormat | null {
  if (startsWith(data, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  if (startsWith(data, [0xff, 0xd8, 0xff])) return "jpeg";
  if (startsWith(data, [0x47, 0x49, 0x46, 0x38])) return "gif";
  if (data.length >= 12 && ascii(data, 0, 4) === "RIFF" && ascii(data, 8, 12) === "WEBP") {
    return "webp";
  }
  if (data.length >= 12 && ascii(data, 4, 8) === "ftyp" && /^avi[fs]$/.test(ascii(data, 8, 12))) {
    return "avif";
  }
  if (startsWith(data, [0x00, 0x00, 0x01, 0x00])) return "ico";
  if (looksLikeText(data) && /<svg[\s>]/i.test(headText(data))) return "svg";
  return null;
}

/** Image format each allowed asset extension must contain. */
export const EXTENSION_IMAGE_FORMAT: Record<string, ImageFormat> = {
  ".png": "png",
  ".jpg": "jpeg",
  ".jpeg": "jpeg",
  ".gif": "gif",
  ".webp": "webp",
  ".avif": "avif",
  ".ico": "ico",
  ".svg": "svg",
};
