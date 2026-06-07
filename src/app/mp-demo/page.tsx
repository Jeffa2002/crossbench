import Image from 'next/image';
import Link from 'next/link';
import Nav from '@/components/Nav';

const sampleBills = [
  { title: 'Electoral Reform Amendment Bill', support: 62, oppose: 29, abstain: 9, votes: 1840 },
  { title: 'Housing Australia Future Fund Measures', support: 48, oppose: 41, abstain: 11, votes: 1294 },
  { title: 'Digital Identity and Privacy Safeguards', support: 37, oppose: 52, abstain: 11, votes: 986 },
];

export default function MpDemoPage() {
  return (
    <main style={{ backgroundColor: '#0B1220', minHeight: '100vh', color: '#F5F7FB' }}>
      <Nav />
      <section style={{ borderBottom: '1px solid #25324D', padding: '48px 20px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '28px' }}>
            <div>
              <p style={{ color: '#2E8B57', fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>Demo dashboard</p>
              <h1 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 700, margin: 0 }}>Sample electorate sentiment</h1>
              <p style={{ color: '#B6C0D1', fontSize: '16px', lineHeight: 1.6, maxWidth: '620px', marginTop: '12px' }}>
                A public preview of the MP dashboard using representative sample data. Live dashboards are electorate-specific and require an MP account.
              </p>
            </div>
            <Link href="/login?next=/mp-dashboard" style={{ backgroundColor: '#2E8B57', color: '#fff', padding: '12px 22px', borderRadius: '8px', fontWeight: 700, fontSize: '14px', textDecoration: 'none' }}>
              Start trial
            </Link>
          </div>

          <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid #25324D', marginBottom: '24px' }}>
            <Image src="/mp-dashboard-mock.png" alt="Crossbench MP dashboard preview" width={1200} height={800} style={{ width: '100%', height: 'auto', display: 'block' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginBottom: '24px' }}>
            {[
              ['Verified votes', '4,120'],
              ['Bills tracked', '38'],
              ['Average participation', '7.4%'],
              ['Updated', 'Every 5 min'],
            ].map(([label, value]) => (
              <div key={label} style={{ backgroundColor: '#111A2E', border: '1px solid #25324D', borderRadius: '8px', padding: '18px' }}>
                <div style={{ color: '#7E8AA3', fontSize: '12px', marginBottom: '6px' }}>{label}</div>
                <div style={{ fontSize: '24px', fontWeight: 700 }}>{value}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gap: '12px' }}>
            {sampleBills.map(bill => (
              <div key={bill.title} style={{ backgroundColor: '#111A2E', border: '1px solid #25324D', borderRadius: '8px', padding: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '14px' }}>
                  <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>{bill.title}</h2>
                  <span style={{ color: '#7E8AA3', fontSize: '13px' }}>{bill.votes.toLocaleString()} verified votes</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: `${bill.support}fr ${bill.oppose}fr ${bill.abstain}fr`, height: '12px', borderRadius: '999px', overflow: 'hidden', backgroundColor: '#25324D' }}>
                  <div style={{ backgroundColor: '#2E8B57' }} />
                  <div style={{ backgroundColor: '#D65A5A' }} />
                  <div style={{ backgroundColor: '#D6A94A' }} />
                </div>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', color: '#B6C0D1', fontSize: '13px', marginTop: '10px' }}>
                  <span>Support {bill.support}%</span>
                  <span>Oppose {bill.oppose}%</span>
                  <span>Abstain {bill.abstain}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
