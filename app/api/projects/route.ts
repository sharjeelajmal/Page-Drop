import type { NextRequest } from "next/server";

import { requireAdmin } from "@/lib/auth/guard";
import { LIMITS } from "@/lib/config";
import { assertSameOrigin, handleApiError, readUploadedFile, requestOrigin } from "@/lib/http";
import { createProject, listProjects } from "@/lib/projects/service";

export const runtime = "nodejs";
export const maxDuration = 120;

/** All projects, newest first. */
export async function GET(request: NextRequest) {
  try {
    requireAdmin(request);
    const projects = await listProjects(requestOrigin(request));
    return Response.json({ projects }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleApiError(error);
  }
}

/** Upload an .html or .zip file and publish it. */
export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    requireAdmin(request);
    const { file, form } = await readUploadedFile(request, "file", LIMITS.maxZipBytes);
    const slug = form.get("slug");
    const project = await createProject(file, requestOrigin(request), typeof slug === "string" ? slug : undefined);
    return Response.json({ project }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
