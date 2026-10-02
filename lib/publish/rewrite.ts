/**
 * Lightweight reference rewriting for HTML and CSS. It only touches URL
 * values (attributes, srcset, url()) and leaves all other markup untouched,
 * so the uploaded page renders exactly as authored.
 */

export type ReferenceRewriter = (ref: string) => string | null;

const URL_ATTRIBUTES =
  /(\s(?:src|href|poster|data-src|data-original|data-bg|data-background|data-image)\s*=\s*)(?:"([^"]*)"|'([^']*)')/gi;
const SRCSET_ATTRIBUTES = /(\s(?:srcset|data-srcset)\s*=\s*)(?:"([^"]*)"|'([^']*)')/gi;
const CSS_URL = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)"'\s]+))\s*\)/gi;

export function rewriteHtml(html: string, rewrite: ReferenceRewriter): string {
  return rewriteCss(
    html
      .replace(URL_ATTRIBUTES, (match, prefix: string, dq?: string, sq?: string) => {
        const value = dq ?? sq ?? "";
        const next = rewrite(decodeEntities(value));
        if (next === null) return match;
        const quote = dq !== undefined ? '"' : "'";
        return `${prefix}${quote}${escapeAttribute(next)}${quote}`;
      })
      .replace(SRCSET_ATTRIBUTES, (match, prefix: string, dq?: string, sq?: string) => {
        const value = dq ?? sq ?? "";
        const next = rewriteSrcset(decodeEntities(value), rewrite);
        if (next === null) return match;
        const quote = dq !== undefined ? '"' : "'";
        return `${prefix}${quote}${escapeAttribute(next)}${quote}`;
      }),
    rewrite,
  );
}

/** Rewrites url(...) references; also applied to inline styles in HTML. */
export function rewriteCss(css: string, rewrite: ReferenceRewriter): string {
  return css.replace(CSS_URL, (match, dq?: string, sq?: string, bare?: string) => {
    const next = rewrite(dq ?? sq ?? bare ?? "");
    return next === null ? match : `url("${next.replace(/"/g, "%22")}")`;
  });
}

/**
 * Parses a srcset list ("a.png 1x, b.png 2x"). URLs may themselves contain
 * commas (CDN transformations), so this follows the HTML spec's approach of
 * reading the URL up to whitespace rather than splitting on commas.
 */
function rewriteSrcset(value: string, rewrite: ReferenceRewriter): string | null {
  const candidates: string[] = [];
  let changed = false;
  let i = 0;

  while (i < value.length) {
    while (i < value.length && /[\s,]/.test(value[i])) i++;
    if (i >= value.length) break;

    let end = i;
    while (end < value.length && !/\s/.test(value[end])) end++;
    let url = value.slice(i, end);
    let descriptor = "";
    if (url.endsWith(",")) {
      url = url.replace(/,+$/, "");
    } else {
      const comma = value.indexOf(",", end);
      const descEnd = comma === -1 ? value.length : comma;
      descriptor = value.slice(end, descEnd).trim();
      end = descEnd;
    }
    i = end + 1;

    const next = rewrite(url);
    if (next !== null) changed = true;
    candidates.push(descriptor ? `${next ?? url} ${descriptor}` : (next ?? url));
  }
  return changed ? candidates.join(", ") : null;
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&#0?38;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'");
}

function escapeAttribute(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
