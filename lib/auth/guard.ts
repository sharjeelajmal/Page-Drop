import "server-only";

import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";
import { AppError } from "@/lib/errors";

/** For Server Components and pages. */
export async function isAuthenticated(): Promise<boolean> {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}

/** For Route Handlers: throws 401 when the request has no valid session. */
export function requireAdmin(request: NextRequest): void {
  if (!verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value)) {
    throw new AppError(401, "unauthorized", "Please sign in to continue.");
  }
}

/** Only allow same-site relative paths as post-login destinations. */
export function safeNextPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return "/";
  return value;
}
