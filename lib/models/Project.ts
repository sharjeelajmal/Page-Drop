import "server-only";

import { Schema, model, models, type HydratedDocument, type InferSchemaType, type Model } from "mongoose";

/**
 * A file belonging to the published site (from the HTML upload or ZIP).
 * Only metadata and the Cloudinary location are stored; file contents live
 * in Cloudinary.
 */
const projectFileSchema = new Schema(
  {
    /** Path relative to the project root, e.g. "assets/logo.png". */
    path: { type: String, required: true },
    cloudinaryPublicId: { type: String, required: true },
    cloudinaryUrl: { type: String, required: true },
    resourceType: { type: String, enum: ["image", "raw", "video"], required: true },
    contentType: { type: String, required: true },
    bytes: { type: Number, required: true },
  },
  { _id: false },
);

/** An image/logo uploaded separately through the asset uploader. */
const assetSchema = new Schema(
  {
    /** File name as uploaded; references to this name are pointed at Cloudinary. */
    originalName: { type: String, required: true },
    cloudinaryPublicId: { type: String, required: true },
    cloudinaryUrl: { type: String, required: true },
    resourceType: { type: String, enum: ["image", "raw", "video"], required: true },
    format: { type: String, required: true },
    bytes: { type: Number, required: true },
    width: Number,
    height: Number,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

const projectSchema = new Schema(
  {
    projectId: { type: String, required: true, unique: true },
    slug: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    originalFileName: { type: String, required: true },
    type: { type: String, enum: ["html", "zip"], required: true },
    status: {
      type: String,
      enum: ["processing", "ready", "failed"],
      required: true,
      default: "processing",
    },
    entryFile: { type: String, required: true, default: "index.html" },
    publicUrl: { type: String, required: true },
    files: { type: [projectFileSchema], default: [] },
    assets: { type: [assetSchema], default: [] },
    totalBytes: { type: Number, default: 0 },
    /** Bumped on every redeploy; files live in site/ (0) or site-r<n>/. */
    revision: { type: Number, default: 0 },
    /** Locked projects are only visible to the private account, never to admin. */
    locked: { type: Boolean, default: false },
    createdBy: { type: String, enum: ["admin", "private"], default: "admin" },
    warnings: { type: [String], default: [] },
    error: String,
  },
  { timestamps: true },
);

// Listing filters on `locked` and sorts by newest first.
projectSchema.index({ locked: 1, createdAt: -1 });

export type ProjectFileRecord = InferSchemaType<typeof projectFileSchema>;
export type AssetRecord = InferSchemaType<typeof assetSchema> & { _id: unknown; createdAt: Date };
export type ProjectRecord = InferSchemaType<typeof projectSchema>;
export type ProjectDocument = HydratedDocument<ProjectRecord>;

export const Project: Model<ProjectRecord> =
  (models.Project as Model<ProjectRecord> | undefined) ?? model<ProjectRecord>("Project", projectSchema);
