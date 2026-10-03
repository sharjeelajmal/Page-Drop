import "server-only";

import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

import { SESSION_COOKIE, readSessionToken, type Session } from "@/lib/auth/session";
import { AppError } from "@/lib/errors";

export type { Session, Role } from "@/lib/auth/session";

/** Current session for Server Components and pages (null when signed out). */
export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  return readSessionToken(store.get(SESSION_COOKIE)?.value);
}

export async function isAuthenticated(): Promise<boolean> {
  return (await getSession()) !== null;
}

/** For Route Handlers: returns the session or throws 401. */
export function requireSession(request: NextRequest): Session {
  const session = readSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) throw new AppError(401, "unauthorized", "Please sign in to continue.");
  return session;
}

export { safeNextPath } from "@/lib/auth/next-path";
