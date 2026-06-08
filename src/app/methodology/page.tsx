import type { Metadata } from 'next';
import Nav from '@/components/Nav';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Methodology — Crossbench',
  description: 'How Crossbench verifies electorates, counts votes, sources bill data, and presents public results.',
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ borderTop: '1px solid #25324D', padding: '32px 0' }}>
      <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 12px', color: '#F5F7FB' }}>{title}</h2>
      <div style={{ color: '#B6C0D1', fontSize: '15px', lineHeight: 1.75 }}>{children}</div>
    </section>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul style={{ margin: '0', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {items.map(item => <li key={item}>{item}</li>)}
    </ul>
  );
}

export default function MethodologyPage() {
  return (
    <main style={{ backgroundColor: '#0B1220', minHeight: '100vh', color: '#F5F7FB' }}>
      <Nav />
      <div style={{ maxWidth: '820px', margin: '0 auto', padding: '48px 24px 80px' }}>
        <p style={{ color: '#2E8B57', fontSize: '13px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 16px' }}>Trust and methodology</p>
        <h1 style={{ fontSize: 'clamp(34px, 5vw, 48px)', fontWeight: 800, lineHeight: 1.12, margin: '0 0 18px' }}>
          How Crossbench counts and presents civic sentiment
        </h1>
        <p style={{ color: '#B6C0D1', fontSize: '17px', lineHeight: 1.7, margin: '0 0 32px' }}>
          Crossbench is not a formal poll and does not claim to represent every voter in an electorate. It is a participation layer: Australians can vote once per bill, link that vote to their federal electorate through address lookup, and see live aggregate sentiment from people who chose to participate.
        </p>

        <Section title="What the results mean">
          <BulletList items={[
            'Results show votes cast by Crossbench users, not a statistically weighted population sample.',
            'Electorate views can change as more verified users vote.',
            'Low vote counts should be read as early signal, not broad community consensus.',
            'Crossbench does not recommend a position on any bill.',
          ]} />
        </Section>

        <Section title="Address and electorate verification">
          <BulletList items={[
            'Users enter their residential address so Crossbench can match them to a federal electorate.',
            'Address lookup uses OpenStreetMap Nominatim geocoding and Crossbench electorate boundary data.',
            'Crossbench stores the electorate assignment and a one-way address hash, not a readable address record.',
            'This is electorate verification and duplicate-resistance, not documentary identity proof.',
            'Address changes are limited and logged so local results are harder to distort.',
          ]} />
        </Section>

        <Section title="Vote counting">
          <BulletList items={[
            'Each signed-in, verified user can cast one Support, Oppose, or Abstain vote per bill.',
            'Changing a vote updates the existing vote rather than creating a second vote.',
            'Votes are linked to the user electorates for aggregation and comparison.',
            'Closed, passed, defeated, withdrawn, or lapsed bills are read-only.',
          ]} />
        </Section>

        <Section title="Bill data">
          <BulletList items={[
            'Bill records are sourced from Australian Parliament public data and related parliamentary pages.',
            'Crossbench tracks bill status, chamber, sponsor, progress, summaries, divisions, and vote availability where available.',
            'Bill pages show the latest update date when the source record provides one.',
            'Plain-English summaries are generated to aid understanding and should be read alongside the official bill material.',
          ]} />
        </Section>

        <Section title="Privacy boundaries">
          <BulletList items={[
            'Public pages and MP dashboards show aggregate results, not individual names beside votes.',
            'MPs see electorate-level sentiment data for bills, not raw residential addresses.',
            'Personal information is used to operate accounts, verify electorate membership, and protect result integrity.',
            'More detail is available in the Privacy Policy.',
          ]} />
        </Section>

        <div style={{ borderTop: '1px solid #25324D', paddingTop: '28px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Link href="/privacy" style={{ color: '#2E8B57', fontWeight: 700, textDecoration: 'none' }}>Privacy Policy</Link>
          <Link href="/terms" style={{ color: '#7E8AA3', fontWeight: 600, textDecoration: 'none' }}>Terms</Link>
          <Link href="/support" style={{ color: '#7E8AA3', fontWeight: 600, textDecoration: 'none' }}>Contact support</Link>
        </div>
      </div>
    </main>
  );
}
