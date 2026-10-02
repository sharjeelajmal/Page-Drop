import type { ApiErrorBody } from "@/types/project";

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

/**
 * Session expired or missing: send the user to the login page. A full page
 * load is intended here so no stale client state survives the sign-out.
 */
function redirectToLogin() {
  const next = `${window.location.pathname}${window.location.search}`;
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full reload is intended
  window.location.href = `/login?next=${encodeURIComponent(next)}`;
}

function errorMessage(body: unknown, status: number): string {
  const message = (body as Partial<ApiErrorBody> | null)?.error?.message;
  if (message) return message;
  if (status === 413) return "The file is too large.";
  if (status === 0) return "Network error. Check your connection and try again.";
  return `Request failed (${status}).`;
}

/**
 * Uploads a file as multipart/form-data, reporting upload progress (0..1).
 * Uses XMLHttpRequest because fetch() has no upload progress events.
 */
export function uploadWithProgress<T>(
  url: string,
  file: File,
  onProgress?: (progress: number) => void,
  fields: Record<string, string> = {},
): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.responseType = "json";

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded / event.total);
    };
    xhr.onload = () => {
      if (xhr.status === 401) redirectToLogin();
      if (xhr.status >= 200 && xhr.status < 300) resolve(xhr.response as T);
      else reject(new ApiClientError(errorMessage(xhr.response, xhr.status), xhr.status));
    };
    xhr.onerror = () => reject(new ApiClientError(errorMessage(null, 0), 0));
    xhr.ontimeout = () => reject(new ApiClientError("The upload timed out.", 0));

    const form = new FormData();
    for (const [name, value] of Object.entries(fields)) form.append(name, value);
    form.append("file", file);
    xhr.send(form);
  });
}

export async function apiRequest<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch {
    throw new ApiClientError(errorMessage(null, 0), 0);
  }
  const body = response.status === 204 ? null : await response.json().catch(() => null);
  if (response.status === 401) redirectToLogin();
  if (!response.ok) throw new ApiClientError(errorMessage(body, response.status), response.status);
  return body as T;
}

export const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Something went wrong.";
