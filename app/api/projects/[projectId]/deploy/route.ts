import type { NextRequest } from "next/server";

import { requireSession } from "@/lib/auth/guard";
import { LIMITS } from "@/lib/config";
import { assertSameOrigin, handleApiError, readUploadedFile, requestOrigin } from "@/lib/http";
import { redeployProject } from "@/lib/projects/service";

export const runtime = "nodejs";
export const maxDuration = 120;

/** Replace a project's files with a new .html/.zip; the public URL stays the same. */
export async function POST(request: NextRequest, ctx: RouteContext<"/api/projects/[projectId]/deploy">) {
  try {
    assertSameOrigin(request);
    const session = requireSession(request);
    const { projectId } = await ctx.params;
    const { file } = await readUploadedFile(request, "file", LIMITS.maxZipBytes);
    const project = await redeployProject(projectId, file, requestOrigin(request), session);
    return Response.json({ project });
  } catch (error) {
    return handleApiError(error);
  }
}
