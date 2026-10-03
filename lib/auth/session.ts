import "server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import { getAdminCredentials, getAuthSecret, getPrivateCredentials } from "@/lib/env";

/**
 * Stateless sessions: a signed cookie "<payload>.<signature>" whose payload
 * holds the account role, username and expiry. Nothing is stored
 * server-side. Two accounts exist:
 *
 * - admin   (ADMIN_USERNAME / ADMIN_PASSWORD): never sees locked projects.
 * - private (PRIVATE_USERNAME / PRIVATE_PASSWORD, optional): sees everything
 *   and can lock/unlock projects.
 */

export const SESSION_COOKIE = "pagedrop_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

export type Role = "admin" | "private";

export interface Session {
  role: Role;
  username: string;
}

interface SessionPayload {
  role: Role;
  sub: string;
  exp: number; // unix seconds
}

const sign = (data: string) => createHmac("sha256", getAuthSecret()).update(data).digest();
const sha256 = (value: string) => createHash("sha256").update(value).digest();

/** Username currently configured for a role (null when the role is disabled). */
function usernameFor(role: Role): string | null {
  if (role === "admin") return getAdminCredentials().username;
  return getPrivateCredentials()?.username ?? null;
}

export function createSessionToken(session: Session): string {
  const payload: SessionPayload = {
    role: session.role,
    sub: session.username,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${sign(encoded).toString("base64url")}`;
}

/**
 * Returns the session for an untampered, unexpired token whose username still
 * matches the account configured for its role (so changing a username or
 * removing the private account signs those sessions out).
 */
export function readSessionToken(token: string | undefined): Session | null {
  if (!token || token.length > 1024) return null;
  try {
    const [encoded, signature, extra] = token.split(".");
    if (!encoded || !signature || extra !== undefined) return null;

    const expected = sign(encoded);
    const actual = Buffer.from(signature, "base64url");
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;

    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString()) as Partial<SessionPayload>;
    if (payload.role !== "admin" && payload.role !== "private") return null;
    if (typeof payload.exp !== "number" || payload.exp <= Date.now() / 1000) return null;
    if (typeof payload.sub !== "string" || payload.sub !== usernameFor(payload.role)) return null;
    return { role: payload.role, username: payload.sub };
  } catch {
    // Malformed token or missing credentials in .env: treat as signed out.
    return null;
  }
}

export const verifySessionToken = (token: string | undefined) => readSessionToken(token) !== null;

/**
 * Constant-time check of submitted credentials against both accounts. Both
 * comparisons always run so timing does not reveal which account exists.
 */
export function checkCredentials(username: string, password: string): Session | null {
  const user = sha256(username);
  const pass = sha256(password);

  const admin = getAdminCredentials();
  const adminOk = timingSafeEqual(user, sha256(admin.username)) && timingSafeEqual(pass, sha256(admin.password));

  const priv = getPrivateCredentials();
  const privateOk = priv
    ? timingSafeEqual(user, sha256(priv.username)) && timingSafeEqual(pass, sha256(priv.password))
    : false;

  if (adminOk) return { role: "admin", username: admin.username };
  if (privateOk && priv) return { role: "private", username: priv.username };
  return null;
}
