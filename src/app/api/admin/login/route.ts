import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createHash } from 'crypto';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? '';
const COOKIE_SECRET = process.env.MISSION_COOKIE_SECRET ?? process.env.NEXTAUTH_SECRET ?? '';

function makeToken(password: string): string {
  return createHash('sha256').update(password + COOKIE_SECRET).digest('hex');
}

export async function POST(req: NextRequest) {
  const { password } = await req.json().catch(() => ({}));
  if (!password || password !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }
  const token = makeToken(password);
  const jar = await cookies();
  jar.set('admin_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/admin',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const jar = await cookies();
  jar.delete('admin_session');
  return NextResponse.json({ ok: true });
}
