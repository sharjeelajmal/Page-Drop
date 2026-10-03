import type { NextRequest } from "next/server";

import { requireSession } from "@/lib/auth/guard";
import { LIMITS } from "@/lib/config";
import { assertSameOrigin, handleApiError, readUploadedFile, requestOrigin } from "@/lib/http";
import { createProject, listProjects } from "@/lib/projects/service";

export const runtime = "nodejs";
export const maxDuration = 120;

/** Projects visible to the signed-in account, newest first. `?view=locked` lists the private vault. */
export async function GET(request: NextRequest) {
  try {
    const session = requireSession(request);
    const view = request.nextUrl.searchParams.get("view") === "locked" ? "locked" : "active";
    const projects = await listProjects(requestOrigin(request), session, view);
    return Response.json({ projects }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return handleApiError(error);
  }
}

/** Upload an .html or .zip file and publish it. */
export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const session = requireSession(request);
    const { file, form } = await readUploadedFile(request, "file", LIMITS.maxZipBytes);
    const slug = form.get("slug");
    const locked = form.get("locked");
    const project = await createProject(file, requestOrigin(request), session, {
      slug: typeof slug === "string" ? slug : undefined,
      locked: locked === "false" ? false : locked === "true" ? true : undefined,
    });
    return Response.json({ project }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
