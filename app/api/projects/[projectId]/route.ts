import type { NextRequest } from "next/server";

import { requireAdmin } from "@/lib/auth/guard";
import { assertSameOrigin, handleApiError, requestOrigin } from "@/lib/http";
import { deleteProject, getProject, renameProject } from "@/lib/projects/service";

export const runtime = "nodejs";

type Ctx = RouteContext<"/api/projects/[projectId]">;

export async function GET(request: NextRequest, ctx: Ctx) {
  try {
    requireAdmin(request);
    const { projectId } = await ctx.params;
    const project = await getProject(projectId, requestOrigin(request));
    return Response.json({ project }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleApiError(error);
  }
}

/** Rename a project: { "name": "New name" } */
export async function PATCH(request: NextRequest, ctx: Ctx) {
  try {
    assertSameOrigin(request);
    requireAdmin(request);
    const { projectId } = await ctx.params;
    const body = (await request.json().catch(() => null)) as { name?: unknown } | null;
    const project = await renameProject(projectId, body?.name, requestOrigin(request));
    return Response.json({ project });
  } catch (error) {
    return handleApiError(error);
  }
}

/** Delete a project, its Cloudinary files and its assets. */
export async function DELETE(request: NextRequest, ctx: Ctx) {
  try {
    assertSameOrigin(request);
    requireAdmin(request);
    const { projectId } = await ctx.params;
    await deleteProject(projectId);
    return new Response(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
