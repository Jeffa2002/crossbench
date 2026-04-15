import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import Link from 'next/link';
import Image from 'next/image';

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
            Crossbench gives you a live, bill-by-bill read of constituent sentiment in your electorate — verified by address, updated in real time.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/login" style={{ backgroundColor: '#2E8B57', color: '#fff', padding: '14px 32px', borderRadius: '8px', fontWeight: 700, fontSize: '15px', textDecoration: 'none' }}>
              Start free 30-day trial →
            </Link>
            <Link href="/mp-dashboard" style={{ backgroundColor: 'transparent', color: '#B6C0D1', padding: '14px 28px', borderRadius: '8px', fontWeight: 500, fontSize: '15px', textDecoration: 'none', border: '1px solid #25324D' }}>
              View demo dashboard
            </Link>
          </div>
          <p style={{ color: '#4A5568', fontSize: '12px', marginTop: '12px' }}>Auto-detected via @aph.gov.au email · No credit card required</p>
        </div>
      </section>

      {/* Dashboard mock */}
      <section style={{ borderBottom: '1px solid #25324D', padding: 'clamp(48px, 6vw, 80px) 0' }}>
        <div style={s.container}>
          <p style={{ color: '#7E8AA3', fontSize: '13px', textAlign: 'center', marginBottom: '24px', fontWeight: 500 }}>Live constituent sentiment — exactly what you'd see for your electorate</p>
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
              { icon: '📊', title: 'Bill-by-bill breakdown', desc: 'See exactly how your electorate is voting on every bill before Parliament — support, oppose, and abstain — updated every 5 minutes.' },
              { icon: '📍', title: 'Verified by address', desc: 'Every vote is tied to a verified residential address. No bots, no duplicates, no out-of-electorate noise. Real signal.' },
              { icon: '⚡', title: 'Real-time updates', desc: 'Watch sentiment shift as a bill moves through Parliament. Know before you walk into caucus or speak to media.' },
              { icon: '🔒', title: 'Aggregated, not identified', desc: 'You see electorate-level totals, not individual identities. Privacy-first by design — compliant and trustworthy.' },
              { icon: '📰', title: 'Ready-to-share insights', desc: 'Export charts and data for newsletters, social posts, media briefings, and electorate reports.' },
              { icon: '🇦🇺', title: 'All 151 electorates', desc: 'Full national coverage. Compare your electorate to state averages and the national result.' },
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
              { step: '02', title: '30-day free trial', desc: 'Full Pro access from day one. No credit card required until you decide to continue.' },
              { step: '03', title: 'Your dashboard, live', desc: 'See constituent sentiment on every current bill, updated continuously as Australians vote.' },
              { step: '04', title: 'Upgrade or invite your team', desc: 'Pro for solo use, Team plan for your office. Invite chiefs of staff and advisers on Team.' },
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

      {/* Pricing */}
      <section style={{ borderBottom: '1px solid #25324D', padding: 'clamp(48px, 6vw, 80px) 0' }}>
        <div style={s.container}>
          <h2 style={{ fontSize: '28px', fontWeight: 700, textAlign: 'center', marginBottom: '8px' }}>Simple pricing</h2>
          <p style={{ color: '#7E8AA3', textAlign: 'center', fontSize: '15px', marginBottom: '48px' }}>Both plans start with a 30-day free trial.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', maxWidth: '700px', margin: '0 auto' }}>
            {[
              { name: 'Pro', price: '$199', period: '/month', logins: '1 login', features: ['Full electorate dashboard', 'All bills, live', 'Data export', 'Email support'], highlight: false },
              { name: 'Team', price: '$499', period: '/month', logins: '3 logins + API access', features: ['Everything in Pro', 'Up to 3 team members', 'API access', 'Priority support'], highlight: true },
            ].map(plan => (
              <div key={plan.name} style={{ backgroundColor: plan.highlight ? '#0D2818' : '#111A2E', border: `1px solid ${plan.highlight ? '#2E8B57' : '#25324D'}`, borderRadius: '16px', padding: '32px', position: 'relative' }}>
                {plan.highlight && <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#2E8B57', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '4px 14px', borderRadius: '999px' }}>MOST POPULAR</div>}
                <div style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>{plan.name}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '36px', fontWeight: 700, color: '#F5F7FB' }}>{plan.price}</span>
                  <span style={{ color: '#7E8AA3', fontSize: '14px' }}>{plan.period} AUD</span>
                </div>
                <p style={{ color: '#7E8AA3', fontSize: '13px', marginBottom: '20px' }}>{plan.logins}</p>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {plan.features.map(f => (
                    <li key={f} style={{ fontSize: '14px', color: '#B6C0D1', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: '#2E8B57', fontWeight: 700 }}>✓</span>{f}
                    </li>
                  ))}
                </ul>
                <Link href="/login" style={{ display: 'block', textAlign: 'center', backgroundColor: plan.highlight ? '#2E8B57' : 'transparent', color: plan.highlight ? '#fff' : '#2E8B57', border: `1px solid ${plan.highlight ? '#2E8B57' : '#2E8B57'}`, padding: '12px', borderRadius: '8px', fontWeight: 700, fontSize: '14px', textDecoration: 'none' }}>
                  Start free trial →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: 'clamp(48px, 6vw, 80px) 0' }}>
        <div style={{ ...s.container, textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 700, marginBottom: '16px' }}>Ready to hear from your electorate?</h2>
          <p style={{ color: '#7E8AA3', fontSize: '16px', marginBottom: '32px', maxWidth: '480px', margin: '0 auto 32px' }}>Sign up with your @aph.gov.au email and your 30-day trial starts immediately.</p>
          <Link href="/login" style={{ backgroundColor: '#2E8B57', color: '#fff', padding: '16px 40px', borderRadius: '8px', fontWeight: 700, fontSize: '16px', textDecoration: 'none', display: 'inline-block' }}>
            Get started free →
          </Link>
          <p style={{ color: '#4A5568', fontSize: '12px', marginTop: '12px' }}>Questions? <Link href="/support" style={{ color: '#4E8FD4', textDecoration: 'none' }}>Contact us</Link></p>
        </div>
      </section>

      <Footer />
    </main>
  );
}
