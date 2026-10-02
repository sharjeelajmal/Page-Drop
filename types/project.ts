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
  createdAt: string;
  updatedAt: string;
}

export interface ApiErrorBody {
  error: { code: string; message: string };
}
