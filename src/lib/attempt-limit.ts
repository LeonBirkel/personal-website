/**
 * Sliding-window counter held in memory. Its job is narrow: stop one client
 * from making the server call an upstream verification endpoint without bound.
 * The spam defence proper lives in the database and survives a restart, so
 * losing this table on deploy costs nothing.
 */

/** A flood from many addresses must not grow the table without bound. */
const MAX_TRACKED_KEYS = 10_000;

const windows = new Map<string, number[]>();

/**
 * Records an attempt and reports whether the caller has now exceeded `limit`
 * within `windowMs`. The attempt being recorded counts towards the total.
 */
export function tooManyAttempts(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const cutoff = now - windowMs;
  const seen = windows.get(key);

  // Dropping the whole table costs one window of accuracy and nothing else,
  // which beats tracking eviction order for a counter this cheap.
  if (!seen && windows.size >= MAX_TRACKED_KEYS) windows.clear();

  const hits = (seen ?? []).filter((at) => at > cutoff);
  hits.push(now);

  if (hits.length > limit) {
    // Cap what is retained, otherwise a client hammering inside one window
    // grows its own array without bound.
    windows.set(key, hits.slice(-(limit + 1)));
    return true;
  }
  windows.set(key, hits);
  return false;
}
