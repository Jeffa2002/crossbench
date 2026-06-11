import type { Metadata } from 'next';
import Link from 'next/link';
import Nav from '@/components/Nav';
import { auth } from '@/lib/auth';
import { mpUpdates } from '@/lib/mp-updates';
import MpNewsletterForm from './MpNewsletterForm';

export const metadata: Metadata = {
  title: 'MP Updates — Crossbench',
  description: 'Product updates and newsletter signup for MPs and Senators using Crossbench.',
};

const container = { maxWidth: '1040px', margin: '0 auto', padding: '48px 20px' } as React.CSSProperties;

export default async function MpUpdatesPage() {
  const session = await auth();
  const email = session?.user?.email ?? '';

  return (
    <main style={{ backgroundColor: '#0B1220', minHeight: '100vh', color: '#F5F7FB' }}>
      <Nav />
      <div style={container}>
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', alignItems: 'start', marginBottom: '24px' }}>
          <div>
            <p style={{ color: '#2E8B57', fontSize: '12px', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 14px' }}>
              MP & Senator communications
            </p>
            <h1 style={{ fontSize: 'clamp(34px, 5vw, 54px)', lineHeight: 1.05, fontWeight: 800, margin: '0 0 16px' }}>
              Crossbench updates for parliamentary offices.
            </h1>
            <p style={{ color: '#B6C0D1', fontSize: '17px', lineHeight: 1.65, maxWidth: '680px', margin: '0 0 22px' }}>
              Product changes, access notes, and release updates for MPs and Senators using Crossbench during early access.
            </p>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <Link href="/login?next=/mp-dashboard" style={{ backgroundColor: '#2E8B57', color: '#fff', padding: '12px 18px', borderRadius: '8px', textDecoration: 'none', fontWeight: 800, fontSize: '14px' }}>
                Open MP dashboard
              </Link>
              <Link href="/for-mps" style={{ backgroundColor: '#111A2E', color: '#B6C0D1', padding: '12px 18px', borderRadius: '8px', textDecoration: 'none', fontWeight: 700, fontSize: '14px', border: '1px solid #25324D' }}>
                MP access overview
              </Link>
            </div>
          </div>

          <aside style={{ backgroundColor: '#111A2E', border: '1px solid #25324D', borderRadius: '12px', padding: '20px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 8px' }}>Subscribe to updates</h2>
            <p style={{ color: '#7E8AA3', fontSize: '14px', lineHeight: 1.6, margin: '0 0 16px' }}>
              Get a short email when Crossbench ships something parliamentary offices should know about.
            </p>
            <MpNewsletterForm initialEmail={email} />
          </aside>
        </section>

        <section style={{ display: 'grid', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 6px' }}>Latest updates</h2>
              <p style={{ color: '#7E8AA3', fontSize: '14px', margin: 0 }}>The same updates can later be sent through the newsletter list.</p>
            </div>
          </div>

          {mpUpdates.map(update => (
            <article key={`${update.date}-${update.title}`} style={{ backgroundColor: '#111A2E', border: '1px solid #25324D', borderRadius: '12px', padding: '22px' }}>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ color: '#2E8B57', border: '1px solid rgba(46,139,87,0.35)', backgroundColor: 'rgba(46,139,87,0.12)', borderRadius: '999px', padding: '4px 10px', fontSize: '11px', fontWeight: 800 }}>
                  {update.label}
                </span>
                <span style={{ color: '#7E8AA3', fontSize: '12px', fontWeight: 700 }}>{update.date}</span>
              </div>
              <h3 style={{ fontSize: '19px', fontWeight: 800, margin: '0 0 8px' }}>{update.title}</h3>
              <p style={{ color: '#B6C0D1', lineHeight: 1.65, margin: '0 0 14px' }}>{update.summary}</p>
              <ul style={{ margin: 0, paddingLeft: '18px', color: '#7E8AA3', lineHeight: 1.7, fontSize: '14px' }}>
                {update.details.map(detail => <li key={detail}>{detail}</li>)}
              </ul>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
