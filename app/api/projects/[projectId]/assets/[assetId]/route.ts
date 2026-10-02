import type { NextRequest } from "next/server";

import { requireAdmin } from "@/lib/auth/guard";
import { assertSameOrigin, handleApiError } from "@/lib/http";
import { removeAsset } from "@/lib/projects/service";

export const runtime = "nodejs";

export async function DELETE(
  request: NextRequest,
  ctx: RouteContext<"/api/projects/[projectId]/assets/[assetId]">,
) {
  try {
    assertSameOrigin(request);
    requireAdmin(request);
    const { projectId, assetId } = await ctx.params;
    await removeAsset(projectId, assetId);
    return new Response(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
