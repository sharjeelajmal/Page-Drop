/**
 * Data transfer types shared between the API routes and the dashboard.
 */

export type ProjectType = "html" | "zip";

export type ProjectStatus = "processing" | "ready" | "failed";

export type CloudinaryResourceType = "image" | "raw" | "video";

export interface AssetDTO {
  id: string;
  originalName: string;
  cloudinaryPublicId: string;
  cloudinaryUrl: string;
  resourceType: CloudinaryResourceType;
  format: string;
  bytes: number;
  width?: number;
  height?: number;
  createdAt: string;
}

export interface ProjectFileDTO {
  path: string;
  bytes: number;
  resourceType: CloudinaryResourceType;
}

export interface ProjectDTO {
  projectId: string;
  slug: string;
  name: string;
  originalFileName: string;
  type: ProjectType;
  status: ProjectStatus;
  entryFile: string;
  publicUrl: string;
  fileCount: number;
  imageCount: number;
  totalBytes: number;
  warnings: string[];
  error?: string;
  assets: AssetDTO[];
  files: ProjectFileDTO[];
  locked: boolean;
  viewCount: number;
  lastVisitedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/** Lightweight row for the projects list. */
export interface ProjectSummaryDTO {
  projectId: string;
  slug: string;
  name: string;
  originalFileName: string;
  type: ProjectType;
  status: ProjectStatus;
  publicUrl: string;
  fileCount: number;
  imageCount: number;
  assetCount: number;
  totalBytes: number;
  thumbnailUrl?: string;
  locked: boolean;
  viewCount: number;
  lastVisitedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type ViewerRole = "admin" | "private";

// ---------------------------------------------------------------------------
// Visitor analytics
// ---------------------------------------------------------------------------

export type VisitDeviceType = "desktop" | "mobile" | "tablet" | "bot";

/** One visitor (a browser/device) and their visits in the selected range. */
export interface VisitorDTO {
  views: number;
  firstAt: string;
  lastAt: string;
  deviceType: VisitDeviceType;
  os: string;
  browser: string;
  country?: string;
  region?: string;
  city?: string;
  /** Referring site of their first visit ("" = direct / app). */
  referrer: string;
}

export interface BreakdownItem {
  label: string;
  count: number;
}

export interface ProjectAnalyticsDTO {
  days: number;
  totals: {
    views: number;
    uniqueVisitors: number;
    linkPreviews: number;
    allTimeViews: number;
    lastVisitAt?: string;
  };
  /** One entry per day (oldest first), in UTC. */
  daily: { date: string; views: number }[];
  devices: BreakdownItem[];
  browsers: BreakdownItem[];
  os: BreakdownItem[];
  countries: BreakdownItem[];
  /** Labels are "City|CC". */
  cities: BreakdownItem[];
  referrers: BreakdownItem[];
  /** Link-preview fetchers / crawlers (WhatsApp, Slack…). Not counted as views. */
  bots: BreakdownItem[];
  /** Most recent visitors first (at most 100). */
  visitors: VisitorDTO[];
}

export interface ApiErrorBody {
  error: { code: string; message: string };
}
