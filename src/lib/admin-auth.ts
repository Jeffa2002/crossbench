import { cookies } from 'next/headers';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

const COOKIE_SECRET = process.env.MISSION_COOKIE_SECRET ?? process.env.NEXTAUTH_SECRET ?? '';
const SESSION_TTL_SECONDS = 8 * 60 * 60;

function sign(value: string): string {
  return createHmac('sha256', COOKIE_SECRET).update(value).digest('hex');
}

export function makeAdminToken(): string {
  const payload = Buffer.from(JSON.stringify({
    purpose: 'admin',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
    nonce: randomBytes(16).toString('hex'),
  })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

function equalTokens(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  return aBuffer.length === bBuffer.length && timingSafeEqual(aBuffer, bBuffer);
}

export async function hasAdminSessionCookie(): Promise<boolean> {
  if (!COOKIE_SECRET) return false;
  const jar = await cookies();
  const token = jar.get('admin_session')?.value;
  if (!token) return false;
  const [payload, signature] = token.split('.');
  if (!payload || !signature || !equalTokens(signature, sign(payload))) return false;

  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return decoded.purpose === 'admin' && typeof decoded.exp === 'number' && decoded.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export async function requireAdminAccess(): Promise<{ email: string } | null> {
  if (await hasAdminSessionCookie()) {
    return { email: process.env.ADMIN_EMAIL ?? 'admin@crossbench.io' };
  }
  return null;
}
