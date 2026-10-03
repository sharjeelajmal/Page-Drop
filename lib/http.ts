import "server-only";

import type { NextRequest } from "next/server";

import { AppError, badRequest, payloadTooLarge } from "@/lib/errors";
import type { ApiErrorBody } from "@/types/project";

export function jsonError(status: number, code: string, message: string) {
  return Response.json({ error: { code, message } } satisfies ApiErrorBody, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

/** Converts any thrown value into a JSON error response without leaking internals. */
export function handleApiError(error: unknown): Response {
  if (error instanceof AppError) {
    if (error.status >= 500) console.error(`[api] ${error.code}: ${error.message}`);
    return jsonError(error.status, error.code, error.message);
  }
  if (isDatabaseConnectivityError(error)) {
    console.error("[api] Database unavailable:", error);
    return jsonError(503, "database_unavailable", "The database is temporarily unavailable.");
  }
  console.error("[api] Unexpected error:", error);
  return jsonError(500, "internal_error", "Something went wrong. Please try again.");
}

function isDatabaseConnectivityError(error: unknown): boolean {
  const name = (error as { name?: string } | null)?.name ?? "";
  return /^Mongo(ServerSelection|Network|NetworkTimeout|NotConnected)Error$/.test(name);
}

/**
 * Rejects cross-site browser requests to mutating endpoints. Published pages
 * run in a sandbox with an opaque ("null") origin, so this also stops an
 * uploaded page from calling the dashboard API.
 */
export function assertSameOrigin(request: NextRequest): void {
  const origin = request.headers.get("origin");
  if (!origin) return; // Non-browser clients don't send Origin.

  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  let originHost: string | null = null;
  try {
    originHost = new URL(origin).host;
  } catch {
    // "null" or malformed origins fall through to the rejection below.
  }
  if (!originHost || !host || originHost !== host.split(",")[0].trim()) {
    throw new AppError(403, "forbidden_origin", "Cross-origin requests are not allowed.");
  }
}

/**
 * Reads a single uploaded file from multipart form data with an early size
 * check. The rest of the form is returned for extra text fields.
 */
export async function readUploadedFile(
  request: NextRequest,
  field: string,
  maxBytes: number,
): Promise<{ file: File; form: FormData }> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("multipart/form-data")) {
    throw badRequest("invalid_request", "Expected a multipart/form-data upload.");
  }
  // Require a declared size so the limit can be enforced before buffering
  // (browsers always send it for form uploads; chunked bodies are refused).
  const contentLength = Number(request.headers.get("content-length"));
  if (!Number.isFinite(contentLength) || contentLength <= 0) {
    throw new AppError(411, "length_required", "Upload size is missing (Content-Length required).");
  }
  // Allow some headroom for multipart boundaries and headers.
  if (contentLength > maxBytes + 64 * 1024) {
    throw payloadTooLarge("The uploaded file is too large.");
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    throw badRequest("invalid_request", "Could not read the uploaded file.");
  }
  const file = form.get(field);
  if (!(file instanceof File) || file.size === 0) {
    throw badRequest("missing_file", "No file was uploaded, or the file is empty.");
  }
  return { file, form };
}

/**
 * Reads a JSON body without ever buffering more than `maxBytes`, even when the
 * client omits or lies about Content-Length. Returns null for invalid JSON.
 */
export async function readJsonBody(request: Request, maxBytes: number): Promise<unknown> {
  if (Number(request.headers.get("content-length") ?? 0) > maxBytes) {
    throw payloadTooLarge("Request body is too large.");
  }
  if (!request.body) return null;

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => undefined);
      throw payloadTooLarge("Request body is too large.");
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}

/** True when the visitor connected over HTTPS (directly or via a TLS-terminating proxy). */
export function isHttpsRequest(request: NextRequest): boolean {
  const forwarded = request.headers.get("x-forwarded-proto")?.split(",")[0].trim().toLowerCase();
  return request.nextUrl.protocol === "https:" || forwarded === "https";
}

/** Origin used to build public URLs when no base URL env var is set. */
export function requestOrigin(request: NextRequest): string {
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0].trim();
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0].trim();
  if (forwardedHost) return `${forwardedProto || "https"}://${forwardedHost}`;
  return request.nextUrl.origin;
}
