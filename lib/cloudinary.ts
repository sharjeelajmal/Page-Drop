import "server-only";

import { v2 as cloudinary, type UploadApiOptions, type UploadApiResponse } from "cloudinary";

import { getCloudinaryConfig } from "@/lib/env";
import { AppError } from "@/lib/errors";

let configured = false;

function client() {
  if (!configured) {
    cloudinary.config({ ...getCloudinaryConfig(), secure: true });
    configured = true;
  }
  return cloudinary;
}

/** Throws a clear configuration error before any work is done. */
export function assertCloudinaryConfigured(): void {
  client();
}

export type UploadResourceType = "image" | "raw";

export interface UploadOptions {
  /** Full public ID. For raw files it should include the file extension. */
  publicId: string;
  resourceType: UploadResourceType;
  overwrite?: boolean;
}

export function uploadBuffer(data: Uint8Array, options: UploadOptions): Promise<UploadApiResponse> {
  const uploadOptions: UploadApiOptions = {
    public_id: options.publicId,
    resource_type: options.resourceType,
    overwrite: options.overwrite ?? false,
    invalidate: options.overwrite ?? false,
    unique_filename: false,
    use_filename: false,
    timeout: 120_000,
  };

  return new Promise((resolve, reject) => {
    const stream = client().uploader.upload_stream(uploadOptions, (error, result) => {
      if (error || !result) {
        reject(
          new AppError(
            502,
            "storage_upload_failed",
            `Cloudinary upload failed${error?.message ? `: ${error.message}` : "."}`,
          ),
        );
      } else {
        resolve(result);
      }
    });
    stream.end(Buffer.from(data.buffer, data.byteOffset, data.byteLength));
  });
}

export async function deleteResource(publicId: string, resourceType: UploadResourceType | "video") {
  await client().uploader.destroy(publicId, { resource_type: resourceType, invalidate: true });
}

/** Best-effort removal of everything stored under a folder prefix. */
export async function deleteFolder(prefix: string): Promise<void> {
  for (const resourceType of ["image", "raw"] as const) {
    try {
      await client().api.delete_resources_by_prefix(`${prefix}/`, { resource_type: resourceType });
    } catch (error) {
      console.error(`[cloudinary] Failed to clean up ${resourceType} resources in ${prefix}:`, error);
    }
  }
}
