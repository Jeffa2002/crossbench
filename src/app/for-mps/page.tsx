import Nav from '@/components/Nav';
import Link from 'next/link';
import Image from 'next/image';
import TrackedLink from '@/components/TrackedLink';

const s = {
  page: { backgroundColor: '#0B1220', minHeight: '100vh', color: '#F5F7FB' } as React.CSSProperties,
  container: { maxWidth: '1100px', margin: '0 auto', padding: '0 20px' } as React.CSSProperties,
};



export default function ForMPsPage() {
  return (
    <main style={s.page}>
      <Nav />

      {/* Hero */}
      <section style={{ borderBottom: '1px solid #25324D', padding: 'clamp(60px, 8vw, 100px) 0' }}>
        <div style={{ ...s.container, textAlign: 'center' }}>
          <p style={{ color: '#2E8B57', fontSize: '13px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '16px' }}>For MPs & Senators</p>
          <h1 style={{ fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: 700, lineHeight: 1.1, marginBottom: '20px', maxWidth: '720px', margin: '0 auto 20px' }}>
            Know what your electorate actually thinks.
          </h1>
          <p style={{ fontSize: '18px', color: '#B6C0D1', lineHeight: 1.6, maxWidth: '560px', margin: '0 auto 36px' }}>
            Crossbench gives you a live, bill-by-bill read of participating constituent sentiment in your electorate — address-matched, aggregated, and updated as people vote.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <TrackedLink href="/login?next=/mp-dashboard" event="MP Trial CTA" style={{ backgroundColor: '#2E8B57', color: '#fff', padding: '14px 32px', borderRadius: '8px', fontWeight: 700, fontSize: '15px', textDecoration: 'none' }}>
              Get free MP access →
            </TrackedLink>
            <TrackedLink href="/mp-demo" event="MP Demo CTA" style={{ backgroundColor: 'transparent', color: '#B6C0D1', padding: '14px 28px', borderRadius: '8px', fontWeight: 500, fontSize: '15px', textDecoration: 'none', border: '1px solid #25324D' }}>
              View demo dashboard
            </TrackedLink>
            <TrackedLink href="/mp-updates" event="MP Updates CTA" style={{ backgroundColor: 'transparent', color: '#B6C0D1', padding: '14px 28px', borderRadius: '8px', fontWeight: 500, fontSize: '15px', textDecoration: 'none', border: '1px solid #25324D' }}>
              Latest updates
            </TrackedLink>
          </div>
          <p style={{ color: '#4A5568', fontSize: '12px', marginTop: '12px' }}>Auto-detected via @aph.gov.au email · Free during early access · No credit card required</p>
        </div>
      </section>

      {/* Dashboard mock */}
      <section style={{ borderBottom: '1px solid #25324D', padding: 'clamp(48px, 6vw, 80px) 0' }}>
        <div style={s.container}>
          <p style={{ color: '#7E8AA3', fontSize: '13px', textAlign: 'center', marginBottom: '24px', fontWeight: 500 }}>Live constituent sentiment — exactly what you&apos;d see for your electorate</p>
          <div style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid #25324D', boxShadow: '0 32px 80px rgba(0,0,0,0.5)' }}>
            <Image src="/mp-dashboard-mock.png" alt="MP electorate dashboard showing constituent sentiment" width={1200} height={800} style={{ width: '100%', height: 'auto', display: 'block' }} />
          </div>
        </div>
      </section>

      {/* Value props */}
      <section style={{ borderBottom: '1px solid #25324D', padding: 'clamp(48px, 6vw, 80px) 0' }}>
        <div style={s.container}>
          <h2 style={{ fontSize: '28px', fontWeight: 700, textAlign: 'center', marginBottom: '48px' }}>What you get</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
            {[
              { icon: '📊', title: 'Bill-by-bill breakdown', desc: 'See how participating constituents are voting on bills before Parliament — support, oppose, and abstain.' },
              { icon: '📍', title: 'Address-matched electorate signal', desc: 'Votes are linked to a federal electorate using address lookup and stored as aggregate local signal, not raw address data.' },
              { icon: '⚡', title: 'Real-time updates', desc: 'Watch sentiment shift as a bill moves through Parliament. Know before you walk into caucus or speak to media.' },
              { icon: '🔒', title: 'Aggregated, not identified', desc: 'You see electorate-level totals, not individual identities. Privacy-first by design — compliant and trustworthy.' },
              { icon: '📰', title: 'Briefing-ready view', desc: 'Scan the bills generating feedback, compare local and national sentiment, and spot where constituents are split.' },
              { icon: '🇦🇺', title: 'National context', desc: 'Compare your electorate with national Crossbench participation data where enough votes have been cast.' },
            ].map(({ icon, title, desc }) => (
              <div key={title} style={{ backgroundColor: '#111A2E', border: '1px solid #25324D', borderRadius: '12px', padding: '24px' }}>
                <div style={{ fontSize: '28px', marginBottom: '12px' }}>{icon}</div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>{title}</h3>
                <p style={{ color: '#7E8AA3', fontSize: '14px', lineHeight: 1.6, margin: 0 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works for MPs */}
      <section style={{ borderBottom: '1px solid #25324D', padding: 'clamp(48px, 6vw, 80px) 0' }}>
        <div style={s.container}>
          <h2 style={{ fontSize: '28px', fontWeight: 700, textAlign: 'center', marginBottom: '48px' }}>Up and running in minutes</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', maxWidth: '900px', margin: '0 auto' }}>
            {[
              { step: '01', title: 'Sign up with your APH email', desc: 'Use your @aph.gov.au address and we automatically verify your MP status and link you to your electorate.' },
              { step: '02', title: 'Free early access', desc: 'Full dashboard access from day one while Crossbench builds enough verified constituent participation.' },
              { step: '03', title: 'Your dashboard, live', desc: 'See constituent sentiment on every current bill, updated continuously as Australians vote.' },
              { step: '04', title: 'Office tools later', desc: 'Paid office features can come later for team workflows, exports, alerts, and briefing packs.' },
            ].map(({ step, title, desc }) => (
              <div key={step} style={{ backgroundColor: '#111A2E', border: '1px solid #25324D', borderRadius: '12px', padding: '28px', position: 'relative' }}>
                <div style={{ color: '#2E8B57', fontSize: '13px', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '12px' }}>{step}</div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>{title}</h3>
                <p style={{ color: '#7E8AA3', fontSize: '14px', lineHeight: 1.6, margin: 0 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Access */}
      <section style={{ borderBottom: '1px solid #25324D', padding: 'clamp(48px, 6vw, 80px) 0' }}>
        <div style={s.container}>
          <h2 style={{ fontSize: '28px', fontWeight: 700, textAlign: 'center', marginBottom: '8px' }}>Free during early access</h2>
          <p style={{ color: '#7E8AA3', textAlign: 'center', fontSize: '15px', margin: '0 auto 32px', maxWidth: '620px', lineHeight: 1.6 }}>
            MPs and Senators can use the core dashboard without paying while Crossbench grows verified constituent participation.
          </p>
          <div style={{ backgroundColor: '#0D2818', border: '1px solid #2E8B57', borderRadius: '16px', padding: '32px', maxWidth: '720px', margin: '0 auto' }}>
            <div style={{ color: '#2E8B57', fontSize: '12px', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>Included now</div>
            <h3 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 10px' }}>Full MP dashboard access</h3>
            <p style={{ color: '#B6C0D1', fontSize: '14px', lineHeight: 1.6, margin: '0 0 20px' }}>
              Paid plans can wait until there is enough constituent signal to make advanced office features worth buying.
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
              {['Electorate dashboard', 'Bill-by-bill sentiment', 'Verified vote breakdowns', 'National comparison', 'MP update newsletter', 'Email support'].map(f => (
                <li key={f} style={{ fontSize: '14px', color: '#B6C0D1', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#2E8B57', fontWeight: 700 }}>✓</span>{f}
                </li>
              ))}
            </ul>
            <TrackedLink href="/login?next=/mp-dashboard" event="MP Free Access CTA" style={{ display: 'inline-block', backgroundColor: '#2E8B57', color: '#fff', border: '1px solid #2E8B57', padding: '12px 18px', borderRadius: '8px', fontWeight: 700, fontSize: '14px', textDecoration: 'none' }}>
              Get free MP access →
            </TrackedLink>
            <Link href="/mp-updates" style={{ display: 'inline-block', marginLeft: '10px', color: '#B6C0D1', border: '1px solid #25324D', padding: '12px 18px', borderRadius: '8px', fontWeight: 700, fontSize: '14px', textDecoration: 'none' }}>
              Read MP updates
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: 'clamp(48px, 6vw, 80px) 0' }}>
        <div style={{ ...s.container, textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 700, marginBottom: '16px' }}>Ready to hear from your electorate?</h2>
          <p style={{ color: '#7E8AA3', fontSize: '16px', marginBottom: '32px', maxWidth: '480px', margin: '0 auto 32px' }}>Sign up with your @aph.gov.au email and your free MP access starts immediately.</p>
          <TrackedLink href="/login?next=/mp-dashboard" event="MP Bottom CTA" style={{ backgroundColor: '#2E8B57', color: '#fff', padding: '16px 40px', borderRadius: '8px', fontWeight: 700, fontSize: '16px', textDecoration: 'none', display: 'inline-block' }}>
            Get started free →
          </TrackedLink>
          <p style={{ color: '#4A5568', fontSize: '12px', marginTop: '12px' }}>Questions? <Link href="/support" style={{ color: '#4E8FD4', textDecoration: 'none' }}>Contact us</Link></p>
        </div>
      </section>


    </main>
  );
}
