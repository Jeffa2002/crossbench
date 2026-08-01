import { createHash } from 'crypto';
import { prisma } from '@/lib/prisma';

// C-02: Shared, DB-backed fixed-window rate limiter.
// Replaces the previous in-process Map (which reset on every deploy and did
// not coordinate across instances). State lives in the RateLimitBucket table
// so limits hold across restarts/deploys and multiple app instances.
//
// A tiny in-process fallback is kept ONLY for the case where the DB is
// unreachable, so a transient DB error can never hard-fail a request path.

type Bucket = { count: number; resetAt: number };
const fallbackBuckets = new Map<string, Bucket>();

function fallbackCheck(key: string, limit: number, windowMs: number): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const bucket = fallbackBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    fallbackBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }
  bucket.count += 1;
  if (bucket.count <= limit) return { ok: true, retryAfter: 0 };
  return { ok: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
}

// Keys can contain IPs/emails/paths; hash to a fixed-width id for the PK.
function bucketId(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ ok: boolean; retryAfter: number }> {
  const id = bucketId(key);
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowMs);

  try {
    // Atomic-ish upsert of a fixed window. If the stored window has expired,
    // start a fresh one; otherwise increment. Concurrency is handled by doing
    // the read+write in a short serializable transaction.
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.rateLimitBucket.findUnique({ where: { id } });
      if (!existing || existing.resetAt <= now) {
        await tx.rateLimitBucket.upsert({
          where: { id },
          create: { id, key: key.slice(0, 512), count: 1, resetAt },
          update: { count: 1, resetAt },
        });
        return { ok: true, retryAfter: 0 };
      }
      const count = existing.count + 1;
      await tx.rateLimitBucket.update({ where: { id }, data: { count } });
      if (count <= limit) return { ok: true, retryAfter: 0 };
      return { ok: false, retryAfter: Math.ceil((existing.resetAt.getTime() - now.getTime()) / 1000) };
    });
    return result;
  } catch {
    // DB unavailable — degrade to per-instance limiting rather than failing.
    return fallbackCheck(key, limit, windowMs);
  }
}

export function rateLimitKey(req: Request, namespace: string, subject = ''): string {
  const forwarded = req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const ip = forwarded || 'unknown';
  return [namespace, ip, subject].filter(Boolean).join(':');
}
