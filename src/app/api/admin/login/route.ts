import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { timingSafeEqual } from 'crypto';
import { makeAdminToken } from '@/lib/admin-auth';
import { checkRateLimit, rateLimitKey } from '@/lib/rate-limit';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? '';

function safePasswordEquals(candidate: unknown): boolean {
  if (typeof candidate !== 'string' || !ADMIN_PASSWORD) return false;
  const candidateBuffer = Buffer.from(candidate);
  const expectedBuffer = Buffer.from(ADMIN_PASSWORD);
  return candidateBuffer.length === expectedBuffer.length && timingSafeEqual(candidateBuffer, expectedBuffer);
}

export async function POST(req: NextRequest) {
  const limited = checkRateLimit(rateLimitKey(req, 'admin-login'), 5, 15 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: 'Too many login attempts. Please wait and try again.' },
      { status: 429, headers: { 'Retry-After': String(limited.retryAfter) } }
    );
  }

  const { password } = await req.json().catch(() => ({}));
  if (!safePasswordEquals(password)) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }
  const token = makeAdminToken();
  const jar = await cookies();
  jar.set('admin_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8,
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const jar = await cookies();
  jar.delete({ name: 'admin_session', path: '/' });
  return NextResponse.json({ ok: true });
}
