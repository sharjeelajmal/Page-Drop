import type { NextRequest } from "next/server";

import { requireSession } from "@/lib/auth/guard";
import { assertSameOrigin, handleApiError } from "@/lib/http";
import { removeAsset } from "@/lib/projects/service";

export const runtime = "nodejs";

export async function DELETE(
  request: NextRequest,
  ctx: RouteContext<"/api/projects/[projectId]/assets/[assetId]">,
) {
  try {
    assertSameOrigin(request);
    const session = requireSession(request);
    const { projectId, assetId } = await ctx.params;
    await removeAsset(projectId, assetId, session);
    return new Response(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
