import "server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import { getAdminCredentials, getAuthSecret } from "@/lib/env";

/**
 * Stateless admin session: a signed cookie "<payload>.<signature>" where the
 * payload holds the username and expiry. Nothing is stored server-side.
 */

export const SESSION_COOKIE = "pagedrop_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

interface SessionPayload {
  sub: string;
  exp: number; // unix seconds
}

const sign = (data: string) => createHmac("sha256", getAuthSecret()).update(data).digest();
const sha256 = (value: string) => createHash("sha256").update(value).digest();

export function createSessionToken(): string {
  const { username } = getAdminCredentials();
  const payload: SessionPayload = {
    sub: username,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${sign(encoded).toString("base64url")}`;
}

/** True for an untampered, unexpired token issued to the current admin user. */
export function verifySessionToken(token: string | undefined): boolean {
  if (!token) return false;
  try {
    const [encoded, signature] = token.split(".");
    if (!encoded || !signature) return false;

    const expected = sign(encoded);
    const actual = Buffer.from(signature, "base64url");
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return false;

    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString()) as SessionPayload;
    return payload.exp > Date.now() / 1000 && payload.sub === getAdminCredentials().username;
  } catch {
    // Malformed token or missing credentials in .env: treat as signed out.
    return false;
  }
}

/** Constant-time comparison of submitted credentials with the ones in .env. */
export function checkCredentials(username: string, password: string): boolean {
  const admin = getAdminCredentials();
  const userOk = timingSafeEqual(sha256(username), sha256(admin.username));
  const passOk = timingSafeEqual(sha256(password), sha256(admin.password));
  return userOk && passOk;
}
