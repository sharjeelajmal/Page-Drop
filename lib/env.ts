import "server-only";

import { AppError } from "@/lib/errors";

/**
 * Server-side environment access. Values are read lazily so that a missing
 * variable produces a clear error at request time instead of crashing the
 * build. Never return these values to the client.
 */

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new AppError(
      500,
      "server_misconfigured",
      `Server is not configured: missing environment variable ${name}.`,
    );
  }
  return value;
}

function optionalUrl(name: string): string | undefined {
  const value = process.env[name]?.trim();
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
    return url.origin + url.pathname.replace(/\/+$/, "");
  } catch {
    console.warn(`[env] Ignoring invalid URL in ${name}.`);
    return undefined;
  }
}

export function getMongoUri(): string {
  return required("MONGODB_URI");
}

export function getCloudinaryConfig() {
  return {
    cloud_name: required("CLOUDINARY_CLOUD_NAME"),
    api_key: required("CLOUDINARY_API_KEY"),
    api_secret: required("CLOUDINARY_API_SECRET"),
  };
}

/** Dashboard login, set in .env. */
export function getAdminCredentials() {
  return {
    username: required("ADMIN_USERNAME"),
    password: required("ADMIN_PASSWORD"),
  };
}

/**
 * Optional second login (PRIVATE_USERNAME / PRIVATE_PASSWORD) that can see
 * and manage locked projects. Returns null when it is not configured or would
 * clash with the admin username.
 */
export function getPrivateCredentials(): { username: string; password: string } | null {
  const username = process.env.PRIVATE_USERNAME?.trim();
  const password = process.env.PRIVATE_PASSWORD?.trim();
  if (!username || !password) return null;
  if (username === process.env.ADMIN_USERNAME?.trim()) {
    console.warn("[env] PRIVATE_USERNAME must differ from ADMIN_USERNAME; the private login is disabled.");
    return null;
  }
  return { username, password };
}

/**
 * Key for signing session cookies. AUTH_SECRET is recommended; without it a
 * key is derived from the admin credentials, so changing the password still
 * signs everyone out.
 */
export function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET?.trim();
  if (secret) return secret;
  const { username, password } = getAdminCredentials();
  return `pagedrop-session:${username}:${password}`;
}

/**
 * Optional fixed site URL, e.g. https://pages.example.com. When unset, links
 * are built from the domain the request came in on, so the same build works
 * on localhost and in production without changes.
 */
export function getAppUrl(): string | undefined {
  return optionalUrl("NEXT_PUBLIC_APP_URL");
}
