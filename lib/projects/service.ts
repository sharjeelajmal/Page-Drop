import "server-only";

import { mapWithConcurrency } from "@/lib/async";
import { assertCloudinaryConfigured, deleteFolder, deleteResource, uploadBuffer } from "@/lib/cloudinary";
import {
  ASSET_EXTENSIONS,
  CLOUDINARY_ROOT_FOLDER,
  LIMITS,
  UPLOAD_CONCURRENCY,
  formatBytes,
} from "@/lib/config";
import { connectToDatabase } from "@/lib/db/mongodb";
import { AppError, notFound, payloadTooLarge, unsupportedMediaType } from "@/lib/errors";
import { contentTypeFor, getExtension, getFileType } from "@/lib/files/mime";
import { cleanUploadedFileName, splitExtension, toPublicIdSegment } from "@/lib/files/paths";
import { EXTENSION_IMAGE_FORMAT, detectImageFormat } from "@/lib/files/signatures";
import type { ExtractedFile } from "@/lib/files/zip";
import { generateProjectId, generateSlug, isValidObjectId, isValidProjectId } from "@/lib/ids";
import { Project, type AssetRecord, type ProjectFileRecord } from "@/lib/models/Project";
import { prepareProjectUpload, type PreparedProject } from "@/lib/projects/prepare";
import { serializeAsset, serializeProject } from "@/lib/projects/serialize";
import { invalidateSite } from "@/lib/publish/cache";
import { CUSTOM_SLUG_HINT, RESERVED_SLUG_HINT, isReservedSlug, isValidCustomSlug } from "@/lib/slug";
import { buildPublicUrl } from "@/lib/urls";
import type { AssetDTO, CloudinaryResourceType, ProjectDTO, ProjectSummaryDTO, ViewerRole } from "@/types/project";

const projectFolder = (projectId: string) => `${CLOUDINARY_ROOT_FOLDER}/${projectId}`;
const siteFolder = (projectId: string, revision: number) =>
  `${projectFolder(projectId)}/${revision > 0 ? `site-r${revision}` : "site"}`;

const MAX_NAME_LENGTH = 120;

/** Who is asking. Admins never see (or touch) locked projects. */
export interface Viewer {
  role: ViewerRole;
}

/**
 * Mongo filter limiting a query to the projects a viewer may see. Every read
 * and write below goes through it, so a locked project is a 404 for admin
 * even if its id is known.
 */
function visibleTo(viewer: Viewer): Record<string, unknown> {
  return viewer.role === "private" ? {} : { locked: { $ne: true } };
}

const projectNotFound = () => notFound("Project not found.");

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

/**
 * Full publishing pipeline: validate → extract → store files in Cloudinary →
 * save metadata in MongoDB → return the public URL.
 */
export async function createProject(
  file: File,
  requestOrigin: string,
  viewer: Viewer,
  options: { slug?: string; locked?: boolean } = {},
): Promise<ProjectDTO> {
  // Validate the chosen link before doing any expensive work.
  const slug = options.slug?.trim() ? normalizeCustomSlug(options.slug) : undefined;
  // Projects made by the private account are locked unless it opts out;
  // admin can never create locked projects.
  const locked = viewer.role === "private" ? options.locked !== false : false;
  const prepared = await prepareProjectUpload(file);
  assertCloudinaryConfigured();
  await connectToDatabase();

  const project = await insertProcessingProject(prepared, requestOrigin, slug, { locked, createdBy: viewer.role });

  try {
    const files = await uploadSiteFiles(siteFolder(project.projectId, 0), prepared.files);
    project.set({
      status: "ready",
      files,
      totalBytes: files.reduce((sum, f) => sum + f.bytes, 0),
    });
    await project.save();
    invalidateSite(project.slug);
    return serializeProject(project.toObject(), requestOrigin);
  } catch (error) {
    const message = error instanceof AppError ? error.message : "Processing failed.";
    await Project.updateOne({ projectId: project.projectId }, { status: "failed", error: message }).catch(
      (dbError) => console.error("[projects] Failed to mark project as failed:", dbError),
    );
    await deleteFolder(projectFolder(project.projectId));
    throw error;
  }
}

export async function getProject(projectId: string, requestOrigin: string, viewer: Viewer): Promise<ProjectDTO> {
  if (!isValidProjectId(projectId)) throw projectNotFound();
  await connectToDatabase();
  const project = await Project.findOne({ projectId, ...visibleTo(viewer) }).lean();
  if (!project) throw projectNotFound();
  return serializeProject(project, requestOrigin);
}

/**
 * Projects for the list page. `view: "locked"` (private account only) lists
 * the locked vault; otherwise only unlocked projects are returned.
 */
export async function listProjects(
  requestOrigin: string,
  viewer: Viewer,
  view: "active" | "locked" = "active",
): Promise<ProjectSummaryDTO[]> {
  await connectToDatabase();
  const match = viewer.role === "private" && view === "locked" ? { locked: true } : { locked: { $ne: true } };
  const rows = await Project.aggregate<{
    projectId: string;
    slug: string;
    name: string;
    originalFileName: string;
    type: ProjectSummaryDTO["type"];
    status: ProjectSummaryDTO["status"];
    totalBytes?: number;
    fileCount: number;
    imageCount: number;
    assetCount: number;
    assetThumb?: string;
    fileThumb?: string;
    locked?: boolean;
    createdAt: Date;
    updatedAt: Date;
  }>([
    { $match: match },
    { $sort: { createdAt: -1 } },
    { $limit: 1000 },
    {
      $project: {
        _id: 0,
        projectId: 1,
        slug: 1,
        name: 1,
        originalFileName: 1,
        type: 1,
        status: 1,
        totalBytes: 1,
        locked: 1,
        createdAt: 1,
        updatedAt: 1,
        fileCount: { $size: "$files" },
        imageCount: {
          $size: { $filter: { input: "$files", cond: { $eq: ["$$this.resourceType", "image"] } } },
        },
        assetCount: { $size: "$assets" },
        assetThumb: { $arrayElemAt: ["$assets.cloudinaryUrl", 0] },
        fileThumb: {
          $arrayElemAt: [
            {
              $map: {
                input: { $filter: { input: "$files", cond: { $eq: ["$$this.resourceType", "image"] } } },
                in: "$$this.cloudinaryUrl",
              },
            },
            0,
          ],
        },
      },
    },
  ]);

  return rows.map((row) => ({
    projectId: row.projectId,
    slug: row.slug,
    name: row.name,
    originalFileName: row.originalFileName,
    type: row.type,
    status: row.status,
    publicUrl: buildPublicUrl(row.slug, requestOrigin),
    fileCount: row.fileCount,
    imageCount: row.imageCount,
    assetCount: row.assetCount,
    totalBytes: row.totalBytes ?? 0,
    thumbnailUrl: row.assetThumb ?? row.fileThumb ?? undefined,
    locked: row.locked === true,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  }));
}

/** Rename and/or lock a project. Only the private account may change `locked`. */
export async function updateProject(
  projectId: string,
  changes: { name?: unknown; locked?: unknown },
  requestOrigin: string,
  viewer: Viewer,
): Promise<ProjectDTO> {
  if (!isValidProjectId(projectId)) throw projectNotFound();
  const update: { name?: string; locked?: boolean } = {};

  if (changes.name !== undefined) {
    const name = typeof changes.name === "string" ? changes.name.replace(/\s+/g, " ").trim() : "";
    if (!name || name.length > MAX_NAME_LENGTH) {
      throw new AppError(400, "invalid_name", `Name must be 1–${MAX_NAME_LENGTH} characters.`);
    }
    update.name = name;
  }
  if (changes.locked !== undefined) {
    if (viewer.role !== "private") throw new AppError(403, "forbidden", "This account cannot lock projects.");
    if (typeof changes.locked !== "boolean") throw new AppError(400, "invalid_request", "`locked` must be true or false.");
    update.locked = changes.locked;
  }
  if (Object.keys(update).length === 0) throw new AppError(400, "invalid_request", "Nothing to update.");

  await connectToDatabase();
  const project = await Project.findOneAndUpdate(
    { projectId, ...visibleTo(viewer) },
    { $set: update },
    { new: true },
  ).lean();
  if (!project) throw projectNotFound();
  return serializeProject(project, requestOrigin);
}

/** Removes the project's Cloudinary folder (site files + assets) and its metadata. */
export async function deleteProject(projectId: string, viewer: Viewer): Promise<void> {
  if (!isValidProjectId(projectId)) throw projectNotFound();
  assertCloudinaryConfigured();
  await connectToDatabase();
  const project = await Project.findOne({ projectId, ...visibleTo(viewer) }, { slug: 1 }).lean();
  if (!project) throw projectNotFound();
  await deleteFolder(projectFolder(projectId));
  await Project.deleteOne({ projectId });
  invalidateSite(project.slug);
}

/**
 * Replaces a project's files with a new HTML/ZIP while keeping its URL, name
 * and assets. New files go to a fresh revision folder and are swapped in only
 * after every upload succeeded, so the live page never serves a half-update.
 */
export async function redeployProject(
  projectId: string,
  file: File,
  requestOrigin: string,
  viewer: Viewer,
): Promise<ProjectDTO> {
  if (!isValidProjectId(projectId)) throw projectNotFound();
  await connectToDatabase();
  // Check access before reading/processing the upload.
  const current = await Project.findOne({ projectId, ...visibleTo(viewer) }, { status: 1, revision: 1 }).lean();
  if (!current) throw projectNotFound();
  const prepared = await prepareProjectUpload(file);
  assertCloudinaryConfigured();
  if (current.status === "processing") {
    throw new AppError(409, "project_busy", "This project is still being processed. Try again shortly.");
  }

  const previousRevision = current.revision ?? 0;
  const revision = previousRevision + 1;
  const folder = siteFolder(projectId, revision);

  let files: ProjectFileRecord[];
  try {
    files = await uploadSiteFiles(folder, prepared.files);
  } catch (error) {
    await deleteFolder(folder);
    throw error;
  }

  const updated = await Project.findOneAndUpdate(
    { projectId, ...visibleTo(viewer) },
    {
      $set: {
        status: "ready",
        type: prepared.type,
        originalFileName: prepared.originalFileName,
        entryFile: prepared.entryFile,
        files,
        totalBytes: files.reduce((sum, f) => sum + f.bytes, 0),
        warnings: prepared.warnings,
        revision,
      },
      $unset: { error: 1 },
    },
    { new: true },
  ).lean();

  if (!updated) {
    // Deleted while we were uploading.
    await deleteFolder(folder);
    throw projectNotFound();
  }
  invalidateSite(updated.slug);
  await deleteFolder(siteFolder(projectId, previousRevision));
  return serializeProject(updated, requestOrigin);
}

function normalizeCustomSlug(raw: string): string {
  const slug = raw.trim().toLowerCase();
  if (isReservedSlug(slug)) throw new AppError(400, "reserved_slug", RESERVED_SLUG_HINT);
  if (!isValidCustomSlug(slug)) throw new AppError(400, "invalid_slug", CUSTOM_SLUG_HINT);
  return slug;
}

const slugTaken = (slug: string) =>
  new AppError(409, "slug_taken", `The link “${slug}” is already used by another project. Choose a different one.`);

/** Live check for the dashboard's link field. */
export async function checkSlugAvailability(raw: string): Promise<{ available: boolean; reason?: string }> {
  const slug = raw.trim().toLowerCase();
  if (isReservedSlug(slug)) return { available: false, reason: RESERVED_SLUG_HINT };
  if (!isValidCustomSlug(slug)) return { available: false, reason: CUSTOM_SLUG_HINT };
  await connectToDatabase();
  const exists = await Project.exists({ slug });
  return exists ? { available: false, reason: "Already used by another project." } : { available: true };
}

async function insertProcessingProject(
  prepared: PreparedProject,
  requestOrigin: string,
  customSlug: string | undefined,
  owner: { locked: boolean; createdBy: ViewerRole },
) {
  if (customSlug && (await Project.exists({ slug: customSlug }))) throw slugTaken(customSlug);

  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = customSlug ?? generateSlug();
    if (isReservedSlug(slug)) continue;
    try {
      return await Project.create({
        projectId: generateProjectId(),
        slug,
        name: prepared.name,
        originalFileName: prepared.originalFileName,
        type: prepared.type,
        status: "processing",
        entryFile: prepared.entryFile,
        publicUrl: buildPublicUrl(slug, requestOrigin),
        warnings: prepared.warnings,
        locked: owner.locked,
        createdBy: owner.createdBy,
      });
    } catch (error) {
      const duplicate = error as { code?: number; keyPattern?: Record<string, unknown> };
      if (duplicate.code !== 11000) throw error;
      // A chosen link that was taken in the meantime can't be retried.
      if (customSlug && duplicate.keyPattern?.slug) throw slugTaken(customSlug);
      // Otherwise retry on the (very unlikely) duplicate generated id/slug.
    }
  }
  throw new AppError(500, "id_generation_failed", "Could not allocate a unique project URL.");
}

/**
 * Uploads every project file to Cloudinary under `folder`
 * (html-pages/<projectId>/site, or site-r<n> after a redeploy).
 * Images become Cloudinary image resources (served straight from the CDN);
 * everything else is stored as a raw resource and served through /<slug>/.
 */
async function uploadSiteFiles(folder: string, files: ExtractedFile[]): Promise<ProjectFileRecord[]> {
  const usedIds = new Set<string>();
  const uniqueId = (resourceType: string, stem: string, ext: string) => {
    let id = `${stem}${ext}`;
    for (let n = 2; usedIds.has(`${resourceType}:${id}`); n++) id = `${stem}-${n}${ext}`;
    usedIds.add(`${resourceType}:${id}`);
    return id;
  };

  const plan = files.map((file) => {
    const segments = file.path.split("/");
    const [stem, ext] = splitExtension(segments.pop() ?? "file");
    const dir = segments.map(toPublicIdSegment).join("/");
    const base = `${folder}/${dir ? `${dir}/` : ""}${toPublicIdSegment(stem)}`;
    const extension = ext.toLowerCase();
    return {
      file,
      isImage: getFileType(file.path)?.kind === "image",
      imageId: uniqueId("image", base, ""),
      rawId: uniqueId("raw", base, extension),
    };
  });

  return mapWithConcurrency(plan, UPLOAD_CONCURRENCY, async ({ file, isImage, imageId, rawId }) => {
    let result;
    if (isImage) {
      try {
        result = await uploadBuffer(file.data, { publicId: imageId, resourceType: "image" });
      } catch {
        // Cloudinary rejects some edge-case images (odd ICO/BMP variants);
        // keep them as plain files so the page still works.
        result = await uploadBuffer(file.data, { publicId: rawId, resourceType: "raw" });
      }
    } else {
      result = await uploadBuffer(file.data, { publicId: rawId, resourceType: "raw" });
    }
    return {
      path: file.path,
      cloudinaryPublicId: result.public_id,
      cloudinaryUrl: result.secure_url,
      resourceType: result.resource_type as CloudinaryResourceType,
      contentType: contentTypeFor(file.path),
      bytes: file.data.byteLength,
    };
  });
}

// ---------------------------------------------------------------------------
// Assets
// ---------------------------------------------------------------------------

const ASSET_MIME_TYPES = ["", "application/octet-stream"];

/**
 * Uploads an image/logo for a project. Uploading a file with the same name
 * again replaces the previous version.
 */
export async function addAsset(projectId: string, file: File, viewer: Viewer): Promise<AssetDTO> {
  if (!isValidProjectId(projectId)) throw projectNotFound();

  const originalName = cleanUploadedFileName(file.name);
  const extension = getExtension(originalName);
  const mime = (file.type || "").toLowerCase();

  if (!(ASSET_EXTENSIONS as readonly string[]).includes(extension)) {
    throw unsupportedMediaType(
      `Unsupported image type "${extension || originalName}". Allowed: ${ASSET_EXTENSIONS.join(", ")}.`,
    );
  }
  if (!mime.startsWith("image/") && !ASSET_MIME_TYPES.includes(mime)) {
    throw unsupportedMediaType(`"${originalName}" is not an image (${mime}).`);
  }
  if (file.size > LIMITS.maxAssetBytes) {
    throw payloadTooLarge(`Images must be at most ${formatBytes(LIMITS.maxAssetBytes)}.`);
  }

  const data = new Uint8Array(await file.arrayBuffer());
  if (detectImageFormat(data) !== EXTENSION_IMAGE_FORMAT[extension]) {
    throw unsupportedMediaType(`"${originalName}" is not a valid ${extension.slice(1).toUpperCase()} image.`);
  }

  assertCloudinaryConfigured();
  await connectToDatabase();

  const project = await Project.findOne({ projectId, ...visibleTo(viewer) }, { slug: 1, status: 1, assets: 1 }).lean();
  if (!project) throw projectNotFound();
  if (project.status !== "ready") {
    throw new AppError(409, "project_not_ready", "Assets can only be added to a published project.");
  }

  const assets = project.assets as AssetRecord[];
  const nameKey = originalName.toLowerCase();
  const existing = assets.find((a) => a.originalName.toLowerCase() === nameKey);
  if (!existing && assets.length >= LIMITS.maxAssetsPerProject) {
    throw payloadTooLarge(`A project can have at most ${LIMITS.maxAssetsPerProject} assets.`);
  }

  const publicId = existing?.cloudinaryPublicId ?? pickAssetPublicId(projectId, originalName, assets);
  const result = await uploadBuffer(data, { publicId, resourceType: "image", overwrite: true });

  const fields = {
    originalName,
    cloudinaryPublicId: result.public_id,
    cloudinaryUrl: result.secure_url,
    resourceType: result.resource_type as CloudinaryResourceType,
    format: result.format,
    bytes: result.bytes,
    width: result.width,
    height: result.height,
  };

  if (existing) {
    await replaceAssetFields(projectId, existing._id, fields);
  } else {
    const pushed = await Project.updateOne(
      {
        projectId,
        [`assets.${LIMITS.maxAssetsPerProject - 1}`]: { $exists: false },
        "assets.originalName": { $ne: originalName },
      },
      { $push: { assets: fields } },
    );
    if (pushed.modifiedCount === 0) {
      // Lost a race: either a concurrent upload added the same name (update
      // it) or the asset limit was reached in the meantime.
      const current = await findAssetByName(projectId, nameKey);
      if (!current) {
        await deleteResource(result.public_id, "image").catch(() => undefined);
        throw payloadTooLarge(`A project can have at most ${LIMITS.maxAssetsPerProject} assets.`);
      }
      await replaceAssetFields(projectId, current._id, fields);
    }
  }

  invalidateSite(project.slug);
  const saved = await findAssetByName(projectId, nameKey);
  if (!saved) throw new AppError(500, "asset_save_failed", "The asset could not be saved.");
  return serializeAsset(saved);
}

export async function removeAsset(projectId: string, assetId: string, viewer: Viewer): Promise<void> {
  if (!isValidProjectId(projectId) || !isValidObjectId(assetId)) throw notFound("Asset not found.");
  assertCloudinaryConfigured();
  await connectToDatabase();

  const project = await Project.findOne(
    { projectId, "assets._id": assetId, ...visibleTo(viewer) },
    { slug: 1, "assets.$": 1 },
  ).lean();
  const asset = (project?.assets as AssetRecord[] | undefined)?.[0];
  if (!asset) throw notFound("Asset not found.");

  try {
    await deleteResource(asset.cloudinaryPublicId, asset.resourceType as CloudinaryResourceType);
  } catch (error) {
    console.error("[assets] Cloudinary delete failed:", error);
    throw new AppError(502, "storage_delete_failed", "Could not delete the asset from Cloudinary.");
  }
  await Project.updateOne({ projectId }, { $pull: { assets: { _id: assetId } } });
  invalidateSite(project?.slug);
}

async function findAssetByName(projectId: string, nameKey: string): Promise<AssetRecord | undefined> {
  const project = await Project.findOne({ projectId }, { assets: 1 }).lean();
  return (project?.assets as AssetRecord[] | undefined)?.find(
    (a) => a.originalName.toLowerCase() === nameKey,
  );
}

async function replaceAssetFields(projectId: string, assetId: unknown, fields: Record<string, unknown>) {
  const update = Object.fromEntries(Object.entries(fields).map(([key, value]) => [`assets.$.${key}`, value]));
  await Project.updateOne({ projectId, "assets._id": assetId }, { $set: update });
}

/**
 * Assets live directly in html-pages/<projectId>/<name>. When two assets
 * share a stem (logo.png / logo.svg) the extension is appended to keep IDs
 * unique, since Cloudinary image IDs don't include the extension.
 */
function pickAssetPublicId(projectId: string, originalName: string, assets: AssetRecord[]): string {
  const [stem, ext] = splitExtension(originalName);
  let safeStem = toPublicIdSegment(stem);
  if (safeStem === "site") safeStem = "site-asset"; // reserved for project files
  const taken = new Set(assets.map((a) => a.cloudinaryPublicId));
  const base = `${projectFolder(projectId)}/${safeStem}`;

  const options = [base, `${base}-${ext.slice(1).toLowerCase()}`];
  for (const option of options) if (!taken.has(option)) return option;
  for (let n = 2; ; n++) if (!taken.has(`${base}-${n}`)) return `${base}-${n}`;
}
