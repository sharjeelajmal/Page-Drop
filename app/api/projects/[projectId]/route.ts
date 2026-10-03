import type { NextRequest } from "next/server";

import { requireSession } from "@/lib/auth/guard";
import { assertSameOrigin, handleApiError, readJsonBody, requestOrigin } from "@/lib/http";
import { deleteProject, getProject, updateProject } from "@/lib/projects/service";

export const runtime = "nodejs";

type Ctx = RouteContext<"/api/projects/[projectId]">;

export async function GET(request: NextRequest, ctx: Ctx) {
  try {
    const session = requireSession(request);
    const { projectId } = await ctx.params;
    const project = await getProject(projectId, requestOrigin(request), session);
    return Response.json({ project }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return handleApiError(error);
  }
}

/** Rename and/or lock: { "name"?: string, "locked"?: boolean } (locking: private account only). */
export async function PATCH(request: NextRequest, ctx: Ctx) {
  try {
    assertSameOrigin(request);
    const session = requireSession(request);
    const { projectId } = await ctx.params;
    const body = (await readJsonBody(request, 4 * 1024)) as { name?: unknown; locked?: unknown } | null;
    const project = await updateProject(
      projectId,
      { name: body?.name, locked: body?.locked },
      requestOrigin(request),
      session,
    );
    return Response.json({ project });
  } catch (error) {
    return handleApiError(error);
  }
}

/** Delete a project, its Cloudinary files and its assets. */
export async function DELETE(request: NextRequest, ctx: Ctx) {
  try {
    assertSameOrigin(request);
    const session = requireSession(request);
    const { projectId } = await ctx.params;
    await deleteProject(projectId, session);
    return new Response(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
