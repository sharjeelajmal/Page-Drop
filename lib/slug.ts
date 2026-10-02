/**
 * Rules for project links chosen by the user (site-url/<slug>).
 * Shared by the server and the dashboard, so no Node-only imports here.
 */

export const CUSTOM_SLUG_MAX = 63;
export const CUSTOM_SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])$/;
export const CUSTOM_SLUG_HINT =
  "Use 3–63 lowercase letters, numbers or hyphens (no hyphen at the start or end).";

/**
 * Links live at the site root, so they must not shadow the app's own pages
 * and well-known files.
 */
export const RESERVED_SLUGS = new Set([
  "api",
  "p",
  "login",
  "logout",
  "signin",
  "signup",
  "auth",
  "admin",
  "dashboard",
  "projects",
  "project",
  "settings",
  "account",
  "assets",
  "static",
  "public",
  "next",
  "favicon",
  "robots",
  "sitemap",
  "sitemaps",
  "manifest",
  "icon",
  "apple-icon",
  "well-known",
]);
export const RESERVED_SLUG_HINT = "This name is reserved by PageDrop. Choose a different link.";

export const isReservedSlug = (value: string) => RESERVED_SLUGS.has(value);

export const isValidCustomSlug = (value: unknown): value is string =>
  typeof value === "string" && CUSTOM_SLUG_RE.test(value) && !RESERVED_SLUGS.has(value);

/**
 * Turns free typing into a link-safe value as the user types:
 * "My Landing_Page!" → "my-landing-page". A trailing hyphen is kept so the
 * user can keep typing; use `finalizeSlug` when the field loses focus.
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s_.]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-+/, "")
    .slice(0, CUSTOM_SLUG_MAX);
}

export const finalizeSlug = (value: string) => slugify(value).replace(/-+$/, "");
