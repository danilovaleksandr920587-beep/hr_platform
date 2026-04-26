/**
 * Simple in-memory rate limiter (per-process).
 * For multi-instance deployments replace with Redis-based solution.
 */

interface Entry {
  count: number;
  resetAt: number;
}

const store = new Map<string, Entry>();

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}, 5 * 60 * 1000);

/**
 * Returns true if the request is allowed.
 * @param key     — unique identifier (e.g. "login:1.2.3.4")
 * @param limit   — max requests per window
 * @param windowS — window size in seconds
 */
export function rateLimit(key: string, limit: number, windowS: number): boolean {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowS * 1000 });
    return true;
  }

  if (entry.count >= limit) return false;

  entry.count++;
  return true;
}
