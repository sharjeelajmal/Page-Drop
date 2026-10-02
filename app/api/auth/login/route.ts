import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

import { clearAttempts, isRateLimited, recordFailedAttempt } from "@/lib/auth/rate-limit";
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS, checkCredentials, createSessionToken } from "@/lib/auth/session";
import { AppError } from "@/lib/errors";
import { assertSameOrigin, handleApiError, jsonError } from "@/lib/http";

export const runtime = "nodejs";

const clientKey = (request: NextRequest) =>
  request.headers.get("x-forwarded-for")?.split(",")[0].trim() || request.headers.get("x-real-ip") || "local";

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);

    const key = clientKey(request);
    const limit = isRateLimited(key);
    if (limit.limited) {
      return jsonError(
        429,
        "too_many_attempts",
        `Too many failed attempts. Try again in ${Math.ceil(limit.retryAfterSeconds / 60)} min.`,
      );
    }

    const body = (await request.json().catch(() => null)) as { username?: unknown; password?: unknown } | null;
    const username = typeof body?.username === "string" ? body.username.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    if (!username || !password || username.length > 200 || password.length > 500) {
      return jsonError(400, "invalid_request", "Enter your username and password.");
    }

    let valid: boolean;
    try {
      valid = checkCredentials(username, password);
    } catch (error) {
      if (error instanceof AppError) {
        throw new AppError(500, "auth_not_configured", "Admin login is not configured. Set ADMIN_USERNAME and ADMIN_PASSWORD in .env.");
      }
      throw error;
    }

    if (!valid) {
      recordFailedAttempt(key);
      // Slow down guessing.
      await new Promise((resolve) => setTimeout(resolve, 600));
      return jsonError(401, "invalid_credentials", "Invalid username or password.");
    }

    clearAttempts(key);
    const store = await cookies();
    store.set(SESSION_COOKIE, createSessionToken(), {
      httpOnly: true,
      secure: request.nextUrl.protocol === "https:",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
    return Response.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
