import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { makeAdminToken } from '@/lib/admin-auth';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? '';

export async function POST(req: NextRequest) {
  const { password } = await req.json().catch(() => ({}));
  if (!password || password !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }
  const token = makeAdminToken(password);
  const jar = await cookies();
  jar.set('admin_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const jar = await cookies();
  jar.delete({ name: 'admin_session', path: '/' });
  return NextResponse.json({ ok: true });
}
