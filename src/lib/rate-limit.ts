type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export function checkRateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }

  bucket.count += 1;
  if (bucket.count <= limit) return { ok: true, retryAfter: 0 };

  return { ok: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
}

export function rateLimitKey(req: Request, namespace: string, subject = ''): string {
  const forwarded = req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const ip = forwarded || 'unknown';
  return [namespace, ip, subject].filter(Boolean).join(':');
}
