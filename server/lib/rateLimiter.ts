// Lightweight token-bucket limiter (per key) for bots/jobs.
type Bucket = { tokens: number; last: number };

const buckets = new Map<string, Bucket>();

export function allow(key: string, ratePerSec = 1, burst = 3): boolean {
  const now = Date.now();
  const b = buckets.get(key) ?? { tokens: burst, last: now };
  const delta = (now - b.last) / 1000;
  b.tokens = Math.min(burst, b.tokens + delta * ratePerSec);
  b.last = now;
  if (b.tokens >= 1) { 
    b.tokens -= 1; 
    buckets.set(key, b); 
    return true; 
  }
  buckets.set(key, b); 
  return false;
}

export function snapshot() {
  return Array.from(buckets.entries()).map(([key, b]) => ({ key, tokens: b.tokens }));
}
