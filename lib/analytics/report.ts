import "server-only";

import type { PipelineStage } from "mongoose";

import { connectToDatabase } from "@/lib/db/mongodb";
import { notFound } from "@/lib/errors";
import { isValidProjectId } from "@/lib/ids";
import { Project } from "@/lib/models/Project";
import { Visit } from "@/lib/models/Visit";
import { visibleTo, type Viewer } from "@/lib/projects/service";
import type { BreakdownItem, ProjectAnalyticsDTO, VisitDeviceType, VisitorDTO } from "@/types/project";

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_VISITORS = 100;

const DEVICE_LABELS: Record<VisitDeviceType, string> = {
  desktop: "Desktop",
  mobile: "Mobile",
  tablet: "Tablet",
  bot: "Bot",
};

async function findVisibleProject(projectId: string, viewer: Viewer) {
  if (!isValidProjectId(projectId)) throw notFound("Project not found.");
  await connectToDatabase();
  const project = await Project.findOne({ projectId, ...visibleTo(viewer) }, { viewCount: 1, lastVisitedAt: 1 }).lean();
  if (!project) throw notFound("Project not found.");
  return project;
}

const human = { deviceType: { $ne: "bot" } };
const top = (
  field: string | Record<string, unknown>,
  limit = 8,
  extra: Record<string, unknown> = {},
): PipelineStage.FacetPipelineStage[] => [
  { $match: { ...human, ...extra } },
  { $group: { _id: field, count: { $sum: 1 } } },
  { $sort: { count: -1, _id: 1 } },
  { $limit: limit },
];

const toItems = (rows: { _id: string | null; count: number }[], label = (v: string) => v): BreakdownItem[] =>
  rows.filter((r) => r._id).map((r) => ({ label: label(r._id as string), count: r.count }));

/** Visitor analytics for one project over the last `days` days (UTC). */
export async function getProjectAnalytics(projectId: string, viewer: Viewer, days = 30): Promise<ProjectAnalyticsDTO> {
  const range = Math.min(Math.max(Math.round(days), 1), 365);
  const project = await findVisibleProject(projectId, viewer);

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const since = new Date(today.getTime() - (range - 1) * DAY_MS);

  type Row = { _id: string; count: number };
  type Facet = {
    totals: { views: number; unique: number }[];
    daily: { _id: string; views: number }[];
    devices: Row[];
    browsers: Row[];
    os: Row[];
    countries: Row[];
    cities: Row[];
    referrers: Row[];
    bots: Row[];
    visitors: {
      views: number;
      firstAt: Date;
      lastAt: Date;
      deviceType: VisitDeviceType;
      os: string;
      browser: string;
      country?: string;
      region?: string;
      city?: string;
      referrer?: string;
    }[];
  };

  const [facet] = await Visit.aggregate<Facet>([
    { $match: { projectId, at: { $gte: since } } },
    {
      $facet: {
        totals: [
          { $match: human },
          { $group: { _id: null, views: { $sum: 1 }, visitors: { $addToSet: "$visitorId" } } },
          { $project: { _id: 0, views: 1, unique: { $size: "$visitors" } } },
        ],
        daily: [
          { $match: human },
          { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$at" } }, views: { $sum: 1 } } },
        ],
        devices: top("$deviceType"),
        browsers: top("$browser"),
        os: top("$os"),
        countries: top("$country", 8, { country: { $type: "string" } }),
        // "city|CC" so the client can show the country name next to the city.
        cities: top({ $concat: ["$city", "|", { $ifNull: ["$country", ""] }] }, 10, { city: { $type: "string" } }),
        referrers: top({ $cond: [{ $eq: [{ $ifNull: ["$referrer", ""] }, ""] }, "Direct / app", "$referrer"] }),
        bots: [
          { $match: { deviceType: "bot" } },
          { $group: { _id: "$bot", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ],
        // One row per visitor (browser/device), newest first.
        visitors: [
          { $match: human },
          { $sort: { at: -1 } },
          {
            $group: {
              _id: "$visitorId",
              views: { $sum: 1 },
              firstAt: { $min: "$at" },
              lastAt: { $first: "$at" },
              deviceType: { $first: "$deviceType" },
              os: { $first: "$os" },
              browser: { $first: "$browser" },
              country: { $first: "$country" },
              region: { $first: "$region" },
              city: { $first: "$city" },
              // How they first arrived (WhatsApp, Instagram…).
              referrer: { $last: "$referrer" },
            },
          },
          { $sort: { lastAt: -1 } },
          { $limit: MAX_VISITORS },
          { $project: { _id: 0 } },
        ],
      },
    },
  ]);

  const daily = new Map(facet.daily.map((d) => [d._id, d.views]));
  const series = Array.from({ length: range }, (_, i) => {
    const date = new Date(since.getTime() + i * DAY_MS).toISOString().slice(0, 10);
    return { date, views: daily.get(date) ?? 0 };
  });

  return {
    days: range,
    totals: {
      views: facet.totals[0]?.views ?? 0,
      uniqueVisitors: facet.totals[0]?.unique ?? 0,
      linkPreviews: facet.bots.reduce((sum, b) => sum + b.count, 0),
      allTimeViews: project.viewCount ?? 0,
      lastVisitAt: project.lastVisitedAt ? new Date(project.lastVisitedAt).toISOString() : undefined,
    },
    daily: series,
    devices: toItems(facet.devices, (v) => DEVICE_LABELS[v as VisitDeviceType] ?? v),
    browsers: toItems(facet.browsers),
    os: toItems(facet.os),
    countries: toItems(facet.countries),
    cities: toItems(facet.cities),
    referrers: toItems(facet.referrers),
    bots: toItems(facet.bots),
    visitors: facet.visitors.map(
      (v): VisitorDTO => ({
        views: v.views,
        firstAt: new Date(v.firstAt).toISOString(),
        lastAt: new Date(v.lastAt).toISOString(),
        deviceType: v.deviceType,
        os: v.os,
        browser: v.browser,
        country: v.country ?? undefined,
        region: v.region ?? undefined,
        city: v.city ?? undefined,
        referrer: v.referrer ?? "",
      }),
    ),
  };
}
