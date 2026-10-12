import "server-only";

import { createHash } from "node:crypto";

import { after } from "next/server";

import { parseUserAgent } from "@/lib/analytics/user-agent";
import { SESSION_COOKIE, readSessionToken } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/mongodb";
import { getAuthSecret } from "@/lib/env";
import { Project } from "@/lib/models/Project";
import { Visit } from "@/lib/models/Visit";

export interface TrackableSite {
  projectId: string;
}

/** Same visitor + page within this window counts once (reloads, double taps, spam). */
const DEDUPE_MS = 30_000;
const recent = new Map<string, number>();

/** Per-project cap on recorded visits per minute, so a flood can't fill the database. */
const MAX_VISITS_PER_MINUTE = 240;
const budgets = new Map<string, { windowStart: number; count: number }>();

function withinBudget(projectId: string, now: number): boolean {
  const budget = budgets.get(projectId);
  if (!budget || budget.windowStart <= now - 60_000) {
    if (budgets.size > 5_000) budgets.clear();
    budgets.set(projectId, { windowStart: now, count: 1 });
    return true;
  }
  return ++budget.count <= MAX_VISITS_PER_MINUTE;
}

/**
 * Records a page view of a published project without delaying the response
 * (the database write runs in `after`). Skips:
 * - anything that is not a top-level page load (iframes such as the
 *   dashboard's previews, prefetches, HEAD requests),
 * - visits by a signed-in PageDrop user (your own checks don't count),
 * - repeats from the same visitor within 30 seconds,
 * - anything beyond a per-project rate cap.
 * Bots/link-preview fetchers are stored but flagged, and not counted as views.
 */
export function trackPageView(request: Request, site: TrackableSite, path: string): void {
  try {
    if (request.method !== "GET") return;
    const h = request.headers;

    const dest = h.get("sec-fetch-dest");
    if (dest && dest !== "document") return;
    if (/prefetch|prerender/i.test(`${h.get("sec-purpose") ?? ""} ${h.get("purpose") ?? ""}`)) return;
    if (readSessionToken(readCookie(h.get("cookie"), SESSION_COOKIE))) return;

    const userAgent = h.get("user-agent") ?? "";
    const agent = parseUserAgent(userAgent);
    const visitorId = hashVisitor(clientIp(h), userAgent);

    const dedupeKey = `${site.projectId}|${visitorId}|${path}`;
    const now = Date.now();
    if ((recent.get(dedupeKey) ?? 0) > now - DEDUPE_MS) return;
    recent.set(dedupeKey, now);
    if (recent.size > 10_000) {
      for (const [key, at] of recent) if (at < now - DEDUPE_MS) recent.delete(key);
    }
    if (!withinBudget(site.projectId, now)) return;

    const visit = {
      projectId: site.projectId,
      at: new Date(now),
      visitorId,
      deviceType: agent.deviceType,
      os: agent.os,
      browser: agent.browser,
      bot: agent.bot,
      country: countryFrom(h),
      region: headerText(h.get("x-vercel-ip-country-region") || h.get("cf-region") || h.get("cloudfront-viewer-country-region-name")),
      city: headerText(h.get("x-vercel-ip-city") || h.get("cf-ipcity") || h.get("cloudfront-viewer-city")),
      referrer: referrerHost(h.get("referer"), new URL(request.url).host),
      path,
    };

    after(async () => {
      try {
        await connectToDatabase();
        await Visit.create(visit);
        if (agent.deviceType !== "bot") {
          // timestamps:false: a visit must not change updatedAt (which drives caches/ETags).
          await Project.updateOne(
            { projectId: site.projectId },
            { $inc: { viewCount: 1 }, $set: { lastVisitedAt: visit.at } },
            { timestamps: false },
          );
        }
      } catch (error) {
        console.error("[analytics] Failed to record visit:", error);
      }
    });
  } catch (error) {
    // Analytics must never break page serving.
    console.error("[analytics] Tracking skipped:", error);
  }
}

function readCookie(header: string | null, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

function clientIp(h: Headers): string {
  return h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "unknown";
}

/** Salted, truncated hash: stable per browser+network, but not reversible to an IP. */
function hashVisitor(ip: string, userAgent: string): string {
  let salt = "pagedrop-visitors";
  try {
    salt = `pagedrop-visitors:${getAuthSecret()}`;
  } catch {
    // Login not configured; fall back to a fixed salt.
  }
  return createHash("sha256").update(`${salt}|${ip}|${userAgent}`).digest("hex").slice(0, 16);
}

/** Country from the hosting platform's geo headers (Vercel, Cloudflare, CloudFront). */
function countryFrom(h: Headers): string | undefined {
  const code = (h.get("x-vercel-ip-country") || h.get("cf-ipcountry") || h.get("cloudfront-viewer-country") || "")
    .trim()
    .toUpperCase();
  return /^[A-Z]{2}$/.test(code) && code !== "XX" && code !== "T1" ? code : undefined;
}

/** Geo header values may be URL-encoded (e.g. "S%C3%A3o%20Paulo"). */
function headerText(raw: string | null): string | undefined {
  if (!raw) return undefined;
  try {
    return decodeURIComponent(raw).slice(0, 80) || undefined;
  } catch {
    return undefined;
  }
}

/** Host of an external referrer; internal navigation within the site counts as direct. */
function referrerHost(referer: string | null, ownHost: string): string {
  if (!referer) return "";
  try {
    const host = new URL(referer).host.toLowerCase().replace(/^www\./, "");
    return host === ownHost.toLowerCase().replace(/^www\./, "") ? "" : host.slice(0, 120);
  } catch {
    return "";
  }
}
