import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { timingSafeEqual } from 'crypto';
import { makeAdminToken } from '@/lib/admin-auth';
import { checkRateLimit, rateLimitKey } from '@/lib/rate-limit';
import { verifyRecaptcha } from '@/lib/recaptcha';
import { authenticateAdmin, hasAnyAdminAccount } from '@/lib/admin-accounts';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? '';

// Legacy shared-password check, kept ONLY as a bootstrap fallback for when no
// per-admin accounts exist yet (C-04). Once AdminUser rows are seeded, this is
// bypassed entirely in favour of email + password + TOTP.
function safePasswordEquals(candidate: unknown): boolean {
  if (typeof candidate !== 'string' || !ADMIN_PASSWORD) return false;
  const candidateBuffer = Buffer.from(candidate);
  const expectedBuffer = Buffer.from(ADMIN_PASSWORD);
  return candidateBuffer.length === expectedBuffer.length && timingSafeEqual(candidateBuffer, expectedBuffer);
}

function setSessionCookie(jar: Awaited<ReturnType<typeof cookies>>) {
  const token = makeAdminToken();
  const productionCookieDomain = process.env.NODE_ENV === 'production' ? '.crossbench.io' : undefined;
  jar.delete({ name: 'admin_session', path: '/' });
  if (productionCookieDomain) jar.delete({ name: 'admin_session', path: '/', domain: productionCookieDomain });
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 60 * 8,
  };
  jar.set('admin_session', token, { ...cookieOptions });
  if (productionCookieDomain) {
    jar.set('admin_session', token, { ...cookieOptions, domain: productionCookieDomain });
  }
}

export async function POST(req: NextRequest) {
  const { email, password, totp, recaptchaToken } = await req.json().catch(() => ({}));

  if (process.env.RECAPTCHA_SECRET_KEY) {
    if (!recaptchaToken) {
      return NextResponse.json({ error: 'Missing reCAPTCHA token' }, { status: 400 });
    }
    const captcha = await verifyRecaptcha(recaptchaToken, 0.5, { expectedAction: 'admin_login' });
    if (!captcha.ok) {
      console.warn(`[reCAPTCHA] Blocked admin login attempt: score=${captcha.score}, error=${captcha.error}`);
      return NextResponse.json(
        { error: 'Automated activity detected. Please try again.' },
        { status: 429 }
      );
    }
  }

  // Rate-limit all login attempts (shared, DB-backed — C-02).
  const limited = await checkRateLimit(rateLimitKey(req, 'admin-login'), 5, 15 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: 'Too many login attempts. Please wait and try again.' },
      { status: 429, headers: { 'Retry-After': String(limited.retryAfter) } }
    );
  }

  const useAccounts = await hasAnyAdminAccount();

  if (useAccounts) {
    // C-04: per-admin identity with password + TOTP MFA.
    const identity = await authenticateAdmin(email, password, totp);
    if (!identity) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    const jar = await cookies();
    setSessionCookie(jar);
    return NextResponse.json({ ok: true });
  }

  // Bootstrap fallback: no admin accounts seeded yet -> legacy shared password.
  if (!safePasswordEquals(password)) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }
  const jar = await cookies();
  setSessionCookie(jar);
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const jar = await cookies();
  jar.delete({ name: 'admin_session', path: '/' });
  if (process.env.NODE_ENV === 'production') {
    jar.delete({ name: 'admin_session', path: '/', domain: '.crossbench.io' });
  }
  return NextResponse.json({ ok: true });
}
