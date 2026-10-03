import type { NextRequest } from "next/server";

import { requireSession } from "@/lib/auth/guard";
import { handleApiError } from "@/lib/http";
import { checkSlugAvailability } from "@/lib/projects/service";

export const runtime = "nodejs";

/** GET /api/projects/slug?value=my-page → { available, reason? } */
export async function GET(request: NextRequest) {
  try {
    requireSession(request);
    const value = request.nextUrl.searchParams.get("value") ?? "";
    const result = await checkSlugAvailability(value);
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleApiError(error);
  }
}
