import { prisma } from "@/lib/prisma";
import Nav from "@/components/Nav";
import Link from "next/link";
import Image from "next/image";
import { getBillTags } from "@/lib/bill-tags";

export const revalidate = 300;

export default async function HomePage() {
  const [billCount, voteCount, electorateCount, bills] = await Promise.all([
    prisma.bill.count({ where: { status: 'Before Parliament', parliamentNumber: 48 } }),
    prisma.vote.count(),
    prisma.electorate.count({ where: { mpName: { not: null } } }),
    prisma.bill.findMany({
      where: { status: 'Before Parliament', parliamentNumber: 48 },
      take: 5,
      orderBy: { lastUpdatedAt: 'desc' },
      include: { _count: { select: { votes: true } } },
    }),
  ]);

  return (
    <main style={{ backgroundColor: '#0B1220', minHeight: '100vh', color: '#F5F7FB' }}>
      <Nav />

      {/* Hero — two-sided */}
      <section style={{ borderBottom: '1px solid #25324D', padding: 'clamp(48px, 8vw, 96px) 0' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px', alignItems: 'center' }}>
          <div>
            <p style={{ color: '#2E8B57', fontSize: '13px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '20px' }}>Australian civic tech</p>
            <h1 style={{ fontSize: 'clamp(34px, 5vw, 54px)', fontWeight: 700, lineHeight: 1.1, marginBottom: '20px' }}>
              The gap between Parliament and the people — closed.
            </h1>
            <p style={{ fontSize: '17px', color: '#B6C0D1', lineHeight: 1.7, marginBottom: '32px' }}>
              Crossbench lets Australians vote on real federal bills. MPs see live constituent sentiment data from their own electorate. Democracy, in real time.
            </p>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
              <Link href="/login" style={{ backgroundColor: '#2E8B57', color: '#fff', padding: '13px 28px', borderRadius: '8px', fontWeight: 700, fontSize: '15px', textDecoration: 'none' }}>
                Start voting →
              </Link>
              <Link href="/for-mps" style={{ backgroundColor: 'rgba(46,139,87,0.1)', color: '#2E8B57', padding: '13px 24px', borderRadius: '8px', fontWeight: 600, fontSize: '15px', textDecoration: 'none', border: '1px solid rgba(46,139,87,0.3)' }}>
                I'm an MP →
              </Link>
            </div>
            <p style={{ color: '#4A5568', fontSize: '13px' }}>Free to use · Verified addresses only · Nonpartisan</p>
          </div>
          {/* Dashboard preview */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid #25324D', boxShadow: '0 24px 60px rgba(0,0,0,0.4)' }}>
              <Image src="/mp-dashboard-mock.png" alt="MP electorate dashboard" width={600} height={400} style={{ width: '100%', height: 'auto', display: 'block' }} />
            </div>
            <p style={{ color: '#4A5568', fontSize: '11px', textAlign: 'center', margin: 0 }}>Live MP electorate dashboard — <Link href="/for-mps" style={{ color: '#4E8FD4', textDecoration: 'none' }}>learn more →</Link></p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section style={{ borderBottom: '1px solid #25324D', padding: '28px 0', backgroundColor: '#0A1020' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 20px', display: 'flex', justifyContent: 'center', gap: 'clamp(24px, 6vw, 80px)', flexWrap: 'wrap' }}>
          {[
            { value: billCount, label: 'Bills before parliament' },
            { value: voteCount.toLocaleString(), label: 'Citizen votes cast' },
            { value: electorateCount, label: 'Electorates covered' },
          ].map(({ value, label }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 'clamp(28px, 5vw, 38px)', fontWeight: 700, color: '#D6A94A' }}>{value}</div>
              <div style={{ color: '#7E8AA3', fontSize: '13px', marginTop: '4px' }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Why Crossbench — manifesto */}
      <section style={{ borderBottom: '1px solid #25324D', padding: 'clamp(48px, 6vw, 80px) 0' }}>
        <div style={{ maxWidth: '760px', margin: '0 auto', padding: '0 20px', textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 700, lineHeight: 1.2, marginBottom: '20px' }}>
            Democracy shouldn't go quiet between elections.
          </h2>
          <p style={{ fontSize: '17px', color: '#B6C0D1', lineHeight: 1.8, marginBottom: '16px' }}>
            Australia has compulsory voting — but a ballot every three years is a blunt instrument. Between elections, Australians have almost no way to signal to their MP what they actually think about specific policy.
          </p>
          <p style={{ fontSize: '17px', color: '#B6C0D1', lineHeight: 1.8, marginBottom: '32px' }}>
            Crossbench fills that gap. Citizens vote on real bills. MPs see the result, electorate by electorate, in real time. Not a poll. Not a petition. Verified constituent sentiment.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {['Nonpartisan by design', 'Verified addresses', 'Privacy-first', 'Independent — not government-run'].map(item => (
              <span key={item} style={{ color: '#7E8AA3', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: '#2E8B57', fontWeight: 700 }}>✓</span>{item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Two audiences */}
      <section style={{ borderBottom: '1px solid #25324D', padding: 'clamp(48px, 6vw, 80px) 0' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 20px' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 700, textAlign: 'center', marginBottom: '40px' }}>Built for two sides of democracy</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            {/* Citizens */}
            <div style={{ backgroundColor: '#111A2E', border: '1px solid #25324D', borderRadius: '16px', padding: '32px' }}>
              <div style={{ fontSize: '32px', marginBottom: '16px' }}>🗳️</div>
              <h3 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '12px' }}>For citizens</h3>
              <p style={{ color: '#7E8AA3', fontSize: '15px', lineHeight: 1.7, marginBottom: '24px' }}>Verify your address, browse bills in plain English, and vote. See how your electorate and the rest of Australia are voting on the same bill.</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {['Free to use — always', 'Plain-English bill summaries', 'See your electorate vs national result', 'Verified, not anonymous'].map(f => (
                  <li key={f} style={{ color: '#B6C0D1', fontSize: '14px', display: 'flex', gap: '8px' }}>
                    <span style={{ color: '#2E8B57', fontWeight: 700, flexShrink: 0 }}>✓</span>{f}
                  </li>
                ))}
              </ul>
              <Link href="/login" style={{ display: 'block', textAlign: 'center', backgroundColor: '#2E8B57', color: '#fff', padding: '12px', borderRadius: '8px', fontWeight: 700, fontSize: '14px', textDecoration: 'none' }}>
                Create free account →
              </Link>
            </div>
            {/* MPs */}
            <div style={{ backgroundColor: '#0D2818', border: '1px solid rgba(46,139,87,0.3)', borderRadius: '16px', padding: '32px', position: 'relative' }}>
              <div style={{ position: 'absolute', top: '20px', right: '20px', backgroundColor: 'rgba(46,139,87,0.2)', color: '#2E8B57', border: '1px solid rgba(46,139,87,0.4)', padding: '4px 12px', borderRadius: '999px', fontSize: '11px', fontWeight: 700 }}>30-day free trial</div>
              <div style={{ fontSize: '32px', marginBottom: '16px' }}>🏛️</div>
              <h3 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '12px' }}>For MPs & Senators</h3>
              <p style={{ color: '#7E8AA3', fontSize: '15px', lineHeight: 1.7, marginBottom: '24px' }}>A live electorate dashboard showing bill-by-bill constituent sentiment. Sign up with your @aph.gov.au email and your trial starts immediately.</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {['Live electorate dashboard', 'Verified, address-linked data', 'All current bills tracked', 'Pro $199/mo · Team $499/mo'].map(f => (
                  <li key={f} style={{ color: '#B6C0D1', fontSize: '14px', display: 'flex', gap: '8px' }}>
                    <span style={{ color: '#2E8B57', fontWeight: 700, flexShrink: 0 }}>✓</span>{f}
                  </li>
                ))}
              </ul>
              <Link href="/for-mps" style={{ display: 'block', textAlign: 'center', backgroundColor: '#2E8B57', color: '#fff', padding: '12px', borderRadius: '8px', fontWeight: 700, fontSize: '14px', textDecoration: 'none' }}>
                Learn more →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section style={{ borderBottom: '1px solid #25324D', padding: 'clamp(48px, 6vw, 80px) 0' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 20px' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 700, textAlign: 'center', marginBottom: '40px' }}>How it works</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            {[
              { step: '01', title: 'Sign up free', desc: 'Create an account in seconds. No credit card, no political affiliation.' },
              { step: '02', title: 'Verify your address', desc: 'Enter your residential address to confirm your electorate. Privacy-first — we never store your full address.' },
              { step: '03', title: 'Vote on bills', desc: 'Browse live bills with plain-English summaries. Support, oppose, or abstain.' },
              { step: '04', title: 'See the picture', desc: 'Watch how your electorate votes in real time — and how it compares to the national result.' },
            ].map(({ step, title, desc }) => (
              <div key={step} style={{ backgroundColor: '#111A2E', border: '1px solid #25324D', borderRadius: '12px', padding: '24px' }}>
                <div style={{ color: '#2E8B57', fontSize: '13px', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '12px' }}>{step}</div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>{title}</h3>
                <p style={{ color: '#7E8AA3', fontSize: '14px', lineHeight: 1.6, margin: 0 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Live bills */}
      <section style={{ padding: 'clamp(48px, 6vw, 80px) 0' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 4px' }}>Currently before parliament</h2>
              <p style={{ color: '#7E8AA3', fontSize: '13px', margin: 0 }}>Vote on these bills right now</p>
            </div>
            <Link href="/bills" style={{ color: '#2E8B57', fontSize: '14px', textDecoration: 'none', fontWeight: 600 }}>View all →</Link>
          </div>
          <div style={{ display: 'grid', gap: '10px' }}>
            {bills.length === 0 ? (
              <div style={{ backgroundColor: '#111A2E', border: '1px solid #25324D', borderRadius: '12px', padding: '48px', textAlign: 'center', color: '#7E8AA3' }}>
                No live bills right now. Check back soon.
              </div>
            ) : bills.map(bill => {
              const tags = getBillTags(bill);
              return (
                <Link key={bill.id} href={`/bills/${bill.id}`} style={{ backgroundColor: '#111A2E', border: '1px solid #25324D', borderRadius: '12px', padding: '18px 24px', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                      {tags.map(tag => (
                        <span key={tag.label} style={{ backgroundColor: tag.bg, color: tag.color, fontSize: '11px', padding: '3px 8px', borderRadius: '4px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          {tag.pulse && <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: tag.color, display: 'inline-block', flexShrink: 0 }} />}
                          {tag.label}
                        </span>
                      ))}
                    </div>
                    <p style={{ color: '#F5F7FB', fontWeight: 500, fontSize: '15px', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bill.title}</p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: '#D6A94A' }}>{bill._count.votes}</div>
                    <div style={{ fontSize: '11px', color: '#7E8AA3' }}>votes</div>
                  </div>
                </Link>
              );
            })}
          </div>
          <div style={{ textAlign: 'center', marginTop: '24px' }}>
            <Link href="/login" style={{ backgroundColor: '#2E8B57', color: '#fff', padding: '13px 32px', borderRadius: '8px', fontWeight: 700, fontSize: '15px', textDecoration: 'none', display: 'inline-block' }}>
              Sign up to vote →
            </Link>
          </div>
        </div>
      </section>


    </main>
  );
}
