import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

import { SESSION_COOKIE } from "@/lib/auth/session";
import { assertSameOrigin, handleApiError } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const store = await cookies();
    store.delete(SESSION_COOKIE);
    return Response.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
