import { cookies } from 'next/headers';
import { createHash, timingSafeEqual } from 'crypto';
import { auth } from './auth';
import { prisma } from './prisma';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? '';
const COOKIE_SECRET = process.env.MISSION_COOKIE_SECRET ?? process.env.NEXTAUTH_SECRET ?? '';

export function makeAdminToken(password: string): string {
  return createHash('sha256').update(password + COOKIE_SECRET).digest('hex');
}

function equalTokens(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  return aBuffer.length === bBuffer.length && timingSafeEqual(aBuffer, bBuffer);
}

export async function hasAdminSessionCookie(): Promise<boolean> {
  if (!ADMIN_PASSWORD || !COOKIE_SECRET) return false;
  const jar = await cookies();
  const token = jar.get('admin_session')?.value;
  if (!token) return false;
  return equalTokens(token, makeAdminToken(ADMIN_PASSWORD));
}

export async function requireAdminAccess(): Promise<{ email: string } | null> {
  if (await hasAdminSessionCookie()) {
    return { email: process.env.ADMIN_EMAIL ?? 'admin@crossbench.io' };
  }

  const session = await auth();
  if (!session?.user) return null;

  const user = await prisma.user.findUnique({
    where: { id: (session.user as any).id },
    select: { role: true, email: true },
  });

  return user?.role === 'ADMIN' ? { email: user.email ?? 'admin@crossbench.io' } : null;
}
