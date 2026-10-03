import "server-only";

import type { AssetRecord, ProjectRecord } from "@/lib/models/Project";
import { buildPublicUrl } from "@/lib/urls";
import type { AssetDTO, CloudinaryResourceType, ProjectDTO } from "@/types/project";

type Timestamps = { createdAt?: Date | null; updatedAt?: Date | null };

const iso = (value: Date | null | undefined) => (value ? new Date(value).toISOString() : "");

export function serializeAsset(asset: AssetRecord): AssetDTO {
  return {
    id: String(asset._id),
    originalName: asset.originalName,
    cloudinaryPublicId: asset.cloudinaryPublicId,
    cloudinaryUrl: asset.cloudinaryUrl,
    resourceType: asset.resourceType as CloudinaryResourceType,
    format: asset.format,
    bytes: asset.bytes,
    width: asset.width ?? undefined,
    height: asset.height ?? undefined,
    createdAt: iso(asset.createdAt),
  };
}

/**
 * `requestOrigin` rebuilds the public URL for the domain currently serving the
 * dashboard, so projects created on localhost show the right link once live.
 */
export function serializeProject(project: ProjectRecord & Timestamps, requestOrigin?: string): ProjectDTO {
  return {
    projectId: project.projectId,
    slug: project.slug,
    name: project.name,
    originalFileName: project.originalFileName,
    type: project.type,
    status: project.status,
    entryFile: project.entryFile,
    publicUrl: requestOrigin ? buildPublicUrl(project.slug, requestOrigin) : project.publicUrl,
    fileCount: project.files.length,
    imageCount: project.files.filter((f) => f.resourceType === "image").length,
    totalBytes: project.totalBytes ?? 0,
    warnings: [...(project.warnings ?? [])],
    error: project.error ?? undefined,
    assets: (project.assets as AssetRecord[]).map(serializeAsset),
    locked: project.locked === true,
    files: project.files.map((f) => ({
      path: f.path,
      bytes: f.bytes,
      resourceType: f.resourceType as CloudinaryResourceType,
    })),
    createdAt: iso(project.createdAt),
    updatedAt: iso(project.updatedAt),
  };
}
