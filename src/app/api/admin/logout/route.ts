import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';

async function clearAdminSession() {
  const jar = await cookies();
  jar.delete({ name: 'admin_session', path: '/' });
  if (process.env.NODE_ENV === 'production') {
    jar.delete({ name: 'admin_session', path: '/', domain: '.crossbench.io' });
  }
}

export async function POST() {
  await clearAdminSession();
  const base = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://crossbench.io';
  return NextResponse.redirect(new URL('/admin-login', base));
}

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.has('_rsc') || req.headers.has('next-router-prefetch')) {
    return new NextResponse(null, { status: 204 });
  }

  await clearAdminSession();
  const base = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://crossbench.io';
  return NextResponse.redirect(new URL('/admin-login', base));
}
