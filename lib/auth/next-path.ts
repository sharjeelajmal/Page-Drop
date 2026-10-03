/** Pure helper shared by proxy.ts and Server Components. */

// Control characters and backslashes: browsers strip/normalise these, which
// can turn "/\t/evil.com" into "//evil.com".
const UNSAFE_PATH_CHARS = /[\u0000-\u001f\u007f\\]/;

/**
 * Only allow same-site relative paths as post-login destinations. Rejects
 * protocol-relative tricks and anything a URL parser would resolve to
 * another origin.
 */
export function safeNextPath(value: string | null | undefined): string {
  if (
    !value ||
    value.length > 512 ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    UNSAFE_PATH_CHARS.test(value)
  ) {
    return "/";
  }
  try {
    const url = new URL(value, "http://pagedrop.invalid");
    if (url.origin !== "http://pagedrop.invalid") return "/";
    return `${url.pathname}${url.search}`;
  } catch {
    return "/";
  }
}
