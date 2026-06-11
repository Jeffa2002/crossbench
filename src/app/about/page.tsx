import type { Metadata } from 'next';
import Nav from '@/components/Nav';
import Link from 'next/link';

export const metadata: Metadata = { title: 'About — Crossbench' };

export default function AboutPage() {
  return (
    <main style={{ backgroundColor: '#0B1220', minHeight: '100vh', color: '#F5F7FB' }}>
      <Nav />

      {/* Hero */}
      <section style={{ borderBottom: '1px solid #25324D', padding: 'clamp(60px, 8vw, 100px) 0' }}>
        <div style={{ maxWidth: '760px', margin: '0 auto', padding: '0 24px' }}>
          <p style={{ color: '#2E8B57', fontSize: '13px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '20px' }}>Our story</p>
          <h1 style={{ fontSize: 'clamp(36px, 5vw, 54px)', fontWeight: 700, lineHeight: 1.15, marginBottom: '24px' }}>
            We vote every three years.<br />Parliament sits every week.
          </h1>
            <p style={{ fontSize: '19px', color: '#B6C0D1', lineHeight: 1.8 }}>
              That gap, between elections, is where most of Australian democracy actually happens. And right now, most Australians have very little say in it.
            </p>
        </div>
      </section>

      {/* The story */}
      <section style={{ borderBottom: '1px solid #25324D', padding: 'clamp(48px, 6vw, 80px) 0' }}>
        <div style={{ maxWidth: '760px', margin: '0 auto', padding: '0 24px' }}>

          <div style={{ marginBottom: '48px' }}>
            <h2 style={{ fontSize: '26px', fontWeight: 700, marginBottom: '16px', marginTop: '0', color: '#F5F7FB' }}>The problem with how things work now</h2>
            <p style={{ fontSize: '16px', color: '#B6C0D1', lineHeight: 1.85, marginBottom: '20px' }}>
              A bill lands in Parliament. It might affect healthcare, housing, how your super is taxed, or how schools are funded. Your MP may vote on it within days. For most Australians, the only way to weigh in is to call the electorate office, write a letter, or sign a petition that may never be read.
            </p>
            <p style={{ fontSize: '16px', color: '#B6C0D1', lineHeight: 1.85, marginBottom: '20px' }}>
              Meanwhile, the loudest voices in the room are often lobbyists, industry groups, and party whips, not constituents.
            </p>
            <p style={{ fontSize: '16px', color: '#B6C0D1', lineHeight: 1.85, marginBottom: '20px' }}>
              We think that is broken. Not because MPs are bad, most go into politics to represent people. But the tools for doing that have barely changed in a century.
            </p>
          </div>

          <div style={{ borderLeft: '3px solid #2E8B57', paddingLeft: '24px', marginBottom: '48px' }}>
            <p style={{ fontSize: '20px', fontStyle: 'italic', color: '#F5F7FB', lineHeight: 1.7, margin: 0 }}>
              Democracy should hear from the people it affects, not just the people who can afford to be heard.
            </p>
            <p style={{ color: '#4A5568', fontSize: '13px', marginTop: '12px', margin: '12px 0 0' }}>That is the point.</p>
          </div>

          <div style={{ marginBottom: '48px' }}>
            <h2 style={{ fontSize: '26px', fontWeight: 700, marginBottom: '16px', marginTop: '0', color: '#F5F7FB' }}>Why we built Crossbench</h2>
            <p style={{ fontSize: '16px', color: '#B6C0D1', lineHeight: 1.85, marginBottom: '20px' }}>
              Crossbench started from a simple question: what if your MP actually knew what their electorate thought about a specific bill before they voted on it?
            </p>
            <p style={{ fontSize: '16px', color: '#B6C0D1', lineHeight: 1.85, marginBottom: '20px' }}>
              Not a national poll. Not a Twitter pile-on. Not a petition with no name verification. Real people, in a real electorate, voting on a real bill, with their address verified, their vote counted once, and the result visible to whoever represents them in Canberra.
            </p>
            <p style={{ fontSize: '16px', color: '#B6C0D1', lineHeight: 1.85, marginBottom: '20px' }}>
              That's Crossbench. A civic layer between elections. A way to keep the conversation going between the polls, not instead of them.
            </p>
          </div>

          <div style={{ marginBottom: '48px' }}>
            <h2 style={{ fontSize: '26px', fontWeight: 700, marginBottom: '16px', marginTop: '0', color: '#F5F7FB' }}>Who built this?</h2>
            <p style={{ fontSize: '16px', color: '#B6C0D1', lineHeight: 1.85, marginBottom: '20px' }}>
              Crossbench is built and operated in Australia by a small independent civic technology team. We are not a government service, political party, campaign group, lobby group, or data broker.
            </p>
            <p style={{ fontSize: '16px', color: '#B6C0D1', lineHeight: 1.85, marginBottom: '20px' }}>
              The platform exists because representative democracy needs better tools between elections: something practical, neutral, and close enough to the parliamentary process to be useful.
            </p>
            <p style={{ fontSize: '16px', color: '#B6C0D1', lineHeight: 1.85, marginBottom: '20px' }}>
              If you need to reach us about privacy, security, or platform integrity, contact <a href="mailto:privacy@crossbench.io" style={{ color: '#2E8B57', textDecoration: 'none' }}>privacy@crossbench.io</a> or <a href="mailto:security@crossbench.io" style={{ color: '#2E8B57', textDecoration: 'none' }}>security@crossbench.io</a>.
            </p>
          </div>

          <div style={{ marginBottom: '48px' }}>
            <h2 style={{ fontSize: '26px', fontWeight: 700, marginBottom: '16px', marginTop: '0', color: '#F5F7FB' }}>What we're not</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {[
                { label: 'Not a petition site', desc: 'Petitions aggregate signatures. We aggregate verified constituent sentiment, bill by bill, electorate by electorate. Different thing.' },
                { label: 'Not a polling service', desc: 'Polls sample. We count every vote cast by verified Crossbench users in an electorate, then show that signal clearly instead of pretending it is a traditional poll.' },
                { label: 'Not political', desc: 'We have no position on any bill. We do not tell you how to vote. We surface what Australians actually think, across all views, without filter or editorial.' },
                { label: 'Not government-run', desc: 'Crossbench is independent. We receive no government funding, have no party affiliation, and take no position on the bills people vote on.' },
                { label: 'Not a data broker', desc: 'We do not sell personal information. Aggregated electorate-level results may be shared or published, but names, emails, readable addresses, and address hashes are not sold.' },
              ].map(({ label, desc }) => (
                <div key={label} style={{ backgroundColor: '#111A2E', border: '1px solid #25324D', borderRadius: '10px', padding: '20px 24px', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                  <span style={{ color: '#2E8B57', fontWeight: 700, fontSize: '18px', flexShrink: 0, lineHeight: 1 }}>✗</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '6px' }}>{label}</div>
                    <p style={{ color: '#7E8AA3', fontSize: '14px', lineHeight: 1.7, margin: 0 }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '48px' }}>
            <h2 style={{ fontSize: '26px', fontWeight: 700, marginBottom: '16px', marginTop: '0', color: '#F5F7FB' }}>How we handle your data</h2>
            <p style={{ fontSize: '16px', color: '#B6C0D1', lineHeight: 1.85, marginBottom: '20px' }}>
              We ask for your address to confirm which electorate you are in. That address is used for lookup and electorate matching, including through OpenStreetMap Nominatim geocoding. After that, we store your electorate assignment and a one-way address hash, not a readable street address.
            </p>
            <p style={{ fontSize: '16px', color: '#B6C0D1', lineHeight: 1.85, marginBottom: '20px' }}>
              Crossbench's core PostgreSQL database is hosted on Australian infrastructure. The point is simple: Australian civic data should be handled here, under Australian privacy expectations, with collection kept to what the product actually needs.
            </p>
            <p style={{ fontSize: '16px', color: '#B6C0D1', lineHeight: 1.85, marginBottom: '20px' }}>
              We handle personal information in line with the Privacy Act 1988 (Cth) and the Australian Privacy Principles. We also design around the same practical ideas behind Western Australia's Privacy and Responsible Information Sharing reforms: collect less, explain the purpose, protect the information, and share only in responsible, clearly bounded ways.
            </p>
            <p style={{ fontSize: '16px', color: '#B6C0D1', lineHeight: 1.85, marginBottom: '20px' }}>
              MPs see electorate-level totals. They do not see names beside votes. They do not see readable addresses or address hashes. They see how verified Crossbench users in their electorate are leaning on a bill.
            </p>
            <p style={{ fontSize: '16px', color: '#B6C0D1', lineHeight: 1.85, marginBottom: '20px' }}>
              We built it this way deliberately. The goal is to make collective sentiment legible to power, not to expose individuals to it.
            </p>
          </div>

          <div style={{ marginBottom: '48px' }}>
            <h2 style={{ fontSize: '26px', fontWeight: 700, marginBottom: '16px', marginTop: '0', color: '#F5F7FB' }}>Does it actually matter?</h2>
            <p style={{ fontSize: '16px', color: '#B6C0D1', lineHeight: 1.85, marginBottom: '20px' }}>
              We are not naive. An MP will not vote against their party because 60% of their electorate ticked "oppose" on an app. Party discipline is real. Caucus is real.
            </p>
            <p style={{ fontSize: '16px', color: '#B6C0D1', lineHeight: 1.85, marginBottom: '20px' }}>
              But independents and crossbenchers hold real power in the Senate. And even within parties, MPs with a clear picture of constituent sentiment have something they did not before: evidence. Something to take into a caucus room. Something to point to when they advocate for their community's position.
            </p>
            <p style={{ fontSize: '16px', color: '#B6C0D1', lineHeight: 1.85, marginBottom: '20px' }}>
              And for citizens, knowing that your view is counted, visible, and in front of the person who represents you in Canberra? That is not nothing. That might be the start of something.
            </p>
          </div>

          <div style={{ borderLeft: '3px solid #D6A94A', paddingLeft: '24px', marginBottom: '48px' }}>
            <p style={{ fontSize: '18px', color: '#F5F7FB', lineHeight: 1.8, margin: 0 }}>
              Democracy should not go quiet between elections. Crossbench is our attempt to keep it talking.
            </p>
          </div>

        </div>
      </section>

      {/* FAQ */}
      <section style={{ borderBottom: '1px solid #25324D', padding: 'clamp(48px, 6vw, 80px) 0' }}>
        <div style={{ maxWidth: '760px', margin: '0 auto', padding: '0 24px' }}>
          <h2 style={{ fontSize: '26px', fontWeight: 700, marginBottom: '36px' }}>Common questions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {[
              { q: 'Is it affiliated with the government?', a: 'No. Independent, nonpartisan, and with no government funding.' },
              { q: 'How does address verification work?', a: 'You enter your residential address. We use it for geocoding and electorate matching, then keep your electorate assignment and a one-way address hash, not a readable address record.' },
              { q: 'Is my vote anonymous?', a: 'Your vote is counted as part of your electorate\'s total and is not shown by name. MPs see aggregated numbers, not individual voter identities.' },
              { q: 'Can I vote on every bill?', a: 'Bills currently before the 48th Parliament are on Crossbench. You can vote on as many as you like, once per bill.' },
              { q: 'Can MPs really see this?', a: 'Yes. MPs with an @aph.gov.au address get a live electorate dashboard. They see bill-by-bill constituent sentiment from verified addresses only.' },
              { q: 'Who built this?', a: 'Crossbench is Australian-built, independent civic technology. It is operated by a small team, not a government service, party, campaign group, or lobby group.' },
              { q: 'Where is the data stored?', a: 'The core Crossbench database is hosted on Australian infrastructure. We handle personal information under Australian privacy law and design around responsible information sharing principles.' },
            ].map(({ q, a }, i, arr) => (
              <div key={q} style={{ padding: '24px 0', borderBottom: i < arr.length - 1 ? '1px solid #1C2940' : 'none' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px', color: '#F5F7FB' }}>{q}</h3>
                <p style={{ color: '#7E8AA3', fontSize: '15px', lineHeight: 1.7, margin: 0 }}>{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: 'clamp(48px, 6vw, 80px) 0' }}>
        <div style={{ maxWidth: '760px', margin: '0 auto', padding: '0 24px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '16px' }}>Ready to weigh in?</h2>
          <p style={{ color: '#7E8AA3', fontSize: '16px', marginBottom: '32px' }}>Browse live bills before Parliament and cast your vote. Free, verified, and nonpartisan.</p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/bills" style={{ backgroundColor: '#2E8B57', color: '#fff', padding: '14px 32px', borderRadius: '8px', fontWeight: 700, fontSize: '15px', textDecoration: 'none' }}>Browse live bills →</Link>
            <Link href="/for-mps" style={{ backgroundColor: 'transparent', color: '#B6C0D1', padding: '14px 28px', borderRadius: '8px', fontWeight: 500, fontSize: '15px', textDecoration: 'none', border: '1px solid #25324D' }}>I'm an MP →</Link>
          </div>
        </div>
      </section>

    </main>
  );
}
