import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  const jar = await cookies();
  jar.delete({ name: 'admin_session', path: '/' });
  if (process.env.NODE_ENV === 'production') {
    jar.delete({ name: 'admin_session', path: '/', domain: '.crossbench.io' });
  }
  const base = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://crossbench.io';
  return NextResponse.redirect(new URL('/admin-login', base));
}
