import type { NextRequest } from "next/server";

import { getProjectAnalytics } from "@/lib/analytics/report";
import { requireSession } from "@/lib/auth/guard";
import { handleApiError } from "@/lib/http";

export const runtime = "nodejs";

/** Visitor analytics: GET /api/projects/<id>/analytics?days=30 */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/projects/[projectId]/analytics">) {
  try {
    const session = requireSession(request);
    const { projectId } = await ctx.params;
    const days = Number(request.nextUrl.searchParams.get("days") ?? 30) || 30;
    const analytics = await getProjectAnalytics(projectId, session, days);
    return Response.json({ analytics }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return handleApiError(error);
  }
}
