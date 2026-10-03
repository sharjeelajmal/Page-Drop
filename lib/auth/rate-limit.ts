import "server-only";

/**
 * In-memory limiter for login attempts. Failures are counted per client IP,
 * per username and globally, so rotating IPs (or spoofed X-Forwarded-For
 * headers) cannot be used to keep guessing one account's password.
 * Resets when the server restarts; good enough for a small admin dashboard.
 */

const WINDOW_MS = 15 * 60 * 1000;
const LIMITS = { ip: 8, user: 12, global: 60 } as const;

type Scope = keyof typeof LIMITS;
const attempts = new Map<string, { count: number; resetAt: number }>();

const keyFor = (scope: Scope, value: string) => `${scope}:${value}`;

function check(scope: Scope, value: string) {
  const entry = attempts.get(keyFor(scope, value));
  if (!entry || entry.resetAt < Date.now()) return 0;
  return entry.count >= LIMITS[scope] ? Math.ceil((entry.resetAt - Date.now()) / 1000) : 0;
}

function bump(scope: Scope, value: string) {
  const now = Date.now();
  const key = keyFor(scope, value);
  const entry = attempts.get(key);
  if (!entry || entry.resetAt < now) attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
  else entry.count++;
}

/** Seconds to wait before another attempt, or 0 when allowed. */
export function retryAfter(ip: string, username: string): number {
  return Math.max(check("ip", ip), check("user", username.toLowerCase()), check("global", "*"));
}

export function recordFailedAttempt(ip: string, username: string): void {
  bump("ip", ip);
  bump("user", username.toLowerCase());
  bump("global", "*");
  if (attempts.size > 5000) {
    const now = Date.now();
    for (const [k, v] of attempts) if (v.resetAt < now) attempts.delete(k);
  }
}

export function clearAttempts(ip: string, username: string): void {
  attempts.delete(keyFor("ip", ip));
  attempts.delete(keyFor("user", username.toLowerCase()));
}
