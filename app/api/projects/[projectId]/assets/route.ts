import type { NextRequest } from "next/server";

import { requireAdmin } from "@/lib/auth/guard";
import { LIMITS } from "@/lib/config";
import { assertSameOrigin, handleApiError, readUploadedFile } from "@/lib/http";
import { addAsset } from "@/lib/projects/service";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Upload one image/logo to a project's Cloudinary folder. */
export async function POST(request: NextRequest, ctx: RouteContext<"/api/projects/[projectId]/assets">) {
  try {
    assertSameOrigin(request);
    requireAdmin(request);
    const { projectId } = await ctx.params;
    const { file } = await readUploadedFile(request, "file", LIMITS.maxAssetBytes);
    const asset = await addAsset(projectId, file);
    return Response.json({ asset }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
