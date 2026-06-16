const buckets = new Map();

const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS = 5;

const prune = (now) => {
  for (const [key, entry] of buckets.entries()) {
    if (now - entry.start > WINDOW_MS) buckets.delete(key);
  }
};

const checkRateLimit = (key) => {
  const now = Date.now();
  prune(now);
  const id = String(key || "unknown").trim() || "unknown";
  const entry = buckets.get(id);
  if (!entry || now - entry.start > WINDOW_MS) {
    buckets.set(id, { start: now, count: 1 });
    return { allowed: true };
  }
  if (entry.count >= MAX_REQUESTS) {
    return { allowed: false, retryAfterSec: Math.ceil((WINDOW_MS - (now - entry.start)) / 1000) };
  }
  entry.count += 1;
  return { allowed: true };
};

module.exports = {
  checkRateLimit,
};
