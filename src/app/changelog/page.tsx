import type { Metadata } from 'next';
import Nav from '@/components/Nav';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Changelog — Crossbench',
  description: 'Public product updates for Crossbench.',
};

const updates = [
  {
    date: '10 June 2026',
    title: 'Bill reader and Politics Pulse',
    summary: 'Crossbench bill pages now lead with plain-English context and include an in-page official bill reader. Sentiment has been redesigned as Politics Pulse.',
    items: [
      'Added a layperson-first bill layout with summary, what changes, who is affected, what happens next, and public sentiment near the top.',
      'Added an official bill text reader with search, expandable sections, PDF links, and APH source links where full text is indexed.',
      'Renamed confusing bill sections so parliamentary progress, formal divisions, and public Crossbench votes are clearly separated.',
      'Improved mobile bill voting controls and progress layouts so voting and reading do not compress into narrow columns.',
      'Relaunched /sentiment as Politics Pulse with a national pulse header, party sentiment board, member leaderboard, confidence labels, and methodology links.',
    ],
  },
  {
    date: 'Earlier releases',
    title: 'Core civic voting platform',
    summary: 'The foundation of Crossbench: verified electorate voting on bills, electorate pages, MP profiles, parliamentary data, and dashboards.',
    items: [
      'Bill tracking from Australian Parliament source data.',
      'Support, oppose, and abstain voting for verified members.',
      'Electorate-level and national aggregate results.',
      'MP and electorate discovery surfaces.',
      'Trust, methodology, privacy, and support pages.',
    ],
  },
];

export default function ChangelogPage() {
  return (
    <main style={{ backgroundColor: '#0B1220', minHeight: '100vh', color: '#F5F7FB' }}>
      <Nav />
      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '48px 24px 80px' }}>
        <p style={{ color: '#2E8B57', fontSize: '13px', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 16px' }}>Product updates</p>
        <h1 style={{ fontSize: 'clamp(34px, 5vw, 50px)', lineHeight: 1.1, fontWeight: 800, margin: '0 0 16px', letterSpacing: 0 }}>
          Crossbench changelog
        </h1>
        <p style={{ color: '#B6C0D1', fontSize: '17px', lineHeight: 1.7, margin: '0 0 34px', maxWidth: '70ch' }}>
          Public notes on what has changed, why it matters, and how the product is becoming clearer for voters, representatives, and civic observers.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {updates.map(update => (
            <article key={update.title} style={{ backgroundColor: '#111A2E', border: '1px solid #25324D', borderRadius: '12px', padding: '24px' }}>
              <p style={{ color: '#7E8AA3', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 10px' }}>{update.date}</p>
              <h2 style={{ color: '#F5F7FB', fontSize: '22px', lineHeight: 1.25, margin: '0 0 8px' }}>{update.title}</h2>
              <p style={{ color: '#B6C0D1', fontSize: '15px', lineHeight: 1.65, margin: '0 0 18px' }}>{update.summary}</p>
              <ul style={{ margin: 0, paddingLeft: '20px', color: '#C8D4E8', fontSize: '14px', lineHeight: 1.75 }}>
                {update.items.map(item => <li key={item}>{item}</li>)}
              </ul>
            </article>
          ))}
        </div>

        <div style={{ marginTop: '28px', paddingTop: '24px', borderTop: '1px solid #25324D', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
          <Link href="/bills" style={{ color: '#2E8B57', fontWeight: 700, textDecoration: 'none' }}>Browse bills</Link>
          <Link href="/sentiment" style={{ color: '#2E8B57', fontWeight: 700, textDecoration: 'none' }}>Open Politics Pulse</Link>
          <Link href="/methodology" style={{ color: '#7E8AA3', fontWeight: 700, textDecoration: 'none' }}>Methodology</Link>
        </div>
      </div>
    </main>
  );
}
