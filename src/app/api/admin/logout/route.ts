import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  const jar = await cookies();
  jar.delete('admin_session');
  const base = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://crossbench.io';
  return NextResponse.redirect(new URL('/admin-login', base));
}
