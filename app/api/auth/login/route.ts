import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

import { clearAttempts, recordFailedAttempt, retryAfter } from "@/lib/auth/rate-limit";
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS, checkCredentials, createSessionToken } from "@/lib/auth/session";
import { AppError } from "@/lib/errors";
import { assertSameOrigin, handleApiError, isHttpsRequest, jsonError, readJsonBody } from "@/lib/http";

export const runtime = "nodejs";

const clientIp = (request: NextRequest) =>
  request.headers.get("x-forwarded-for")?.split(",")[0].trim() || request.headers.get("x-real-ip") || "local";

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);

    // Small, bounded body: this endpoint is reachable without a session.
    const body = (await readJsonBody(request, 4 * 1024)) as { username?: unknown; password?: unknown } | null;
    const username = typeof body?.username === "string" ? body.username.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    if (!username || !password || username.length > 200 || password.length > 500) {
      return jsonError(400, "invalid_request", "Enter your username and password.");
    }

    const ip = clientIp(request);
    const wait = retryAfter(ip, username);
    if (wait > 0) {
      return jsonError(429, "too_many_attempts", `Too many failed attempts. Try again in ${Math.ceil(wait / 60)} min.`);
    }

    let session;
    try {
      session = checkCredentials(username, password);
    } catch (error) {
      if (error instanceof AppError) {
        throw new AppError(500, "auth_not_configured", "Login is not configured. Set ADMIN_USERNAME and ADMIN_PASSWORD in .env.");
      }
      throw error;
    }

    if (!session) {
      recordFailedAttempt(ip, username);
      // Slow down guessing.
      await new Promise((resolve) => setTimeout(resolve, 600));
      return jsonError(401, "invalid_credentials", "Invalid username or password.");
    }

    clearAttempts(ip, username);
    const store = await cookies();
    store.set(SESSION_COOKIE, createSessionToken(session), {
      httpOnly: true,
      secure: isHttpsRequest(request),
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleApiError(error);
  }
}
