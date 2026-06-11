import type { Metadata } from 'next';
import Link from 'next/link';
import Nav from '@/components/Nav';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = {
  title: 'Unsubscribe — Crossbench MP Updates',
};

export default async function MpNewsletterUnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  let status: 'missing' | 'done' | 'invalid' = 'missing';

  if (token) {
    const result = await prisma.mpNewsletterSubscription.updateMany({
      where: { unsubscribeToken: token, active: true },
      data: { active: false, unsubscribedAt: new Date() },
    });
    status = result.count > 0 ? 'done' : 'invalid';
  }

  return (
    <main style={{ backgroundColor: '#0B1220', minHeight: '100vh', color: '#F5F7FB' }}>
      <Nav />
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '72px 20px' }}>
        <section style={{ backgroundColor: '#111A2E', border: '1px solid #25324D', borderRadius: '12px', padding: '32px' }}>
          <p style={{ color: '#2E8B57', fontSize: '12px', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 12px' }}>
            MP updates
          </p>
          <h1 style={{ fontSize: '30px', fontWeight: 800, margin: '0 0 12px' }}>
            {status === 'done' ? 'You are unsubscribed.' : status === 'invalid' ? 'This unsubscribe link is no longer active.' : 'Unsubscribe link missing.'}
          </h1>
          <p style={{ color: '#B6C0D1', lineHeight: 1.65, margin: '0 0 24px' }}>
            {status === 'done'
              ? 'That address will no longer receive Crossbench MP update emails.'
              : 'If you still receive an MP update email, use the unsubscribe link in that email or contact support.'}
          </p>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <Link href="/mp-updates" style={{ backgroundColor: '#2E8B57', color: '#fff', padding: '12px 18px', borderRadius: '8px', textDecoration: 'none', fontWeight: 800, fontSize: '14px' }}>
              Back to MP updates
            </Link>
            <Link href="/support" style={{ backgroundColor: '#0B1220', color: '#B6C0D1', padding: '12px 18px', borderRadius: '8px', textDecoration: 'none', fontWeight: 700, fontSize: '14px', border: '1px solid #25324D' }}>
              Contact support
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
