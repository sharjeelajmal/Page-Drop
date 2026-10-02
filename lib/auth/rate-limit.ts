import "server-only";

/**
 * Small in-memory limiter for login attempts (per client key). Good enough
 * for a single-admin dashboard; it resets when the server restarts.
 */

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;

const attempts = new Map<string, { count: number; resetAt: number }>();

export function isRateLimited(key: string): { limited: boolean; retryAfterSeconds: number } {
  const entry = attempts.get(key);
  if (!entry || entry.resetAt < Date.now()) return { limited: false, retryAfterSeconds: 0 };
  return {
    limited: entry.count >= MAX_ATTEMPTS,
    retryAfterSeconds: Math.ceil((entry.resetAt - Date.now()) / 1000),
  };
}

export function recordFailedAttempt(key: string): void {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.resetAt < now) attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
  else entry.count++;

  // Keep the map from growing without bound.
  if (attempts.size > 5000) {
    for (const [k, v] of attempts) if (v.resetAt < now) attempts.delete(k);
  }
}

export function clearAttempts(key: string): void {
  attempts.delete(key);
}
