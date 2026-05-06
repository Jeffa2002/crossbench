import type { Metadata } from 'next';
import { Suspense } from 'react';
import Nav from '@/components/Nav';
import LoginClient from './LoginClient';

export const metadata: Metadata = { title: 'Sign in — Crossbench' };

export default function LoginPage() {
  return (
    <main className='min-h-screen bg-[#0B1220] text-[#F5F7FB]'>
      <Nav />
      <Suspense fallback={<div className='p-8 text-center text-[#7E8AA3]'>Loading sign in…</div>}>
        <LoginClient />
      </Suspense>
    </main>
  );
}
