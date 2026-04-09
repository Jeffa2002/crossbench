import Nav from '@/components/Nav';
import Link from 'next/link';

export const metadata = {
  title: 'Terms of Service | Crossbench',
  description: 'The rules for using Crossbench — your civic voting platform.',
};

const responsibilities = [
  ['2.1 Be truthful', 'Provide accurate, complete information. Don\'t impersonate anyone or misrepresent your address or electorate.'],
  ['2.2 One person, one account', 'Accounts are personal. Don\'t share your login, let others vote using your account, or create multiple accounts to vote more than once.'],
  ['2.3 Keep your credentials secure', 'Protect your password. If you suspect your account is compromised, tell us at security@crossbench.io as soon as practically possible.'],
  ['2.4 Vote honestly', 'Votes must be your own genuine view. No voting on behalf of others, no paid voting, no bots or automation.'],
  ['2.5 Verify your address accurately', 'Use your genuine current residential address. Don\'t use a false address to influence electorate data.'],
  ['2.6 Use the platform respectfully', 'Don\'t attempt to manipulate, game, disrupt, or undermine platform integrity or vote data.'],
  ['2.7 No commercial use', 'Crossbench is a civic tool. Don\'t scrape, resell, or commercially exploit our data without written permission.'],
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '36px' }}>
      <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#F5F7FB', marginBottom: '12px', borderBottom: '1px solid #25324D', paddingBottom: '8px' }}>
        {title}
      </h2>
      <div style={{ color: '#B6C0D1', fontSize: '15px', lineHeight: '1.7' }}>
        {children}
      </div>
    </div>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p style={{ margin: '0 0 12px' }}>{children}</p>;
}

export default function TermsPage() {
  return (
    <main style={{ backgroundColor: '#0B1220', minHeight: '100vh', color: '#F5F7FB' }}>
      <Nav />
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '48px 24px 80px' }}>

        {/* Header */}
        <div style={{ marginBottom: '40px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#2E8B57', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Legal
          </span>
          <h1 style={{ fontSize: '36px', fontWeight: 800, color: '#F5F7FB', margin: '8px 0 12px', lineHeight: 1.2 }}>
            Terms of Service
          </h1>
          <p style={{ color: '#7E8AA3', fontSize: '14px', margin: 0 }}>
            Effective date: 9 April 2026
          </p>
        </div>

        {/* Key obligations callout */}
        <div style={{
          backgroundColor: 'rgba(46,139,87,0.08)', border: '1px solid rgba(46,139,87,0.25)',
          borderRadius: '12px', padding: '20px 24px', marginBottom: '40px'
        }}>
          <p style={{ fontSize: '13px', fontWeight: 700, color: '#2E8B57', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Your vote matters. Use it honestly.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {[
              '✓ Be truthful — provide your real details',
              '✓ One account per person — no sharing logins',
              '✓ Vote for yourself only — no bots, no inducements',
              '✓ Use your genuine address for electorate verification',
              '✓ Report suspected account compromise to security@crossbench.io',
            ].map(line => (
              <p key={line} style={{ margin: 0, color: '#B6C0D1', fontSize: '14px' }}>{line}</p>
            ))}
          </div>
        </div>

        {/* Intro */}
        <div style={{ backgroundColor: '#111A2E', border: '1px solid #25324D', borderRadius: '12px', padding: '24px', marginBottom: '40px' }}>
          <p style={{ color: '#B6C0D1', fontSize: '15px', lineHeight: '1.7', margin: 0 }}>
            Crossbench is a civic platform for exploring parliamentary bills, verifying electorate information, and recording how people vote. It is built for public insight, not for entertainment or commercial data use. By creating an account or using Crossbench, you agree to these Terms.
          </p>
        </div>

        <Section title="1. Using Crossbench">
          <P>You may use Crossbench only if you can form a binding agreement under Australian law and you use the service in line with these Terms.</P>
          <P>You agree to use the platform honestly, respectfully, and in good faith.</P>
        </Section>

        <Section title="2. Your responsibilities">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '12px' }}>
            {responsibilities.map(([title, body]) => (
              <div key={title} style={{
                padding: '16px', backgroundColor: '#0B1220',
                border: '1px solid #25324D', borderRadius: '8px'
              }}>
                <p style={{ fontWeight: 700, color: '#F5F7FB', margin: '0 0 4px', fontSize: '14px' }}>{title}</p>
                <p style={{ color: '#B6C0D1', margin: 0, fontSize: '14px', lineHeight: '1.6' }}>{body}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section title="3. What Crossbench provides">
          <P>We provide the service in good faith. We may change, improve, suspend, or remove features over time.</P>
          <P>We may suspend or remove accounts that violate these Terms or that we reasonably believe pose a risk to platform integrity.</P>
          <P>We may share or commercialise <strong style={{ color: "#F5F7FB" }}>aggregated, anonymised vote and electorate data</strong> (e.g. how an electorate voted on a bill). We will <strong style={{ color: "#F5F7FB" }}>never sell or share personal information</strong> — your name, email address, or address hash will never be sold, shared with third parties, or used for commercial purposes. Crossbench is not affiliated with the Australian Parliament, any political party, or any candidate.</P>
        </Section>

        <Section title="4. Service availability">
          <P>We aim to keep Crossbench available and reliable, but we cannot guarantee uninterrupted service. The service is provided <strong style={{ color: '#F5F7FB' }}>as-is</strong> and <strong style={{ color: '#F5F7FB' }}>as-available</strong>.</P>
        </Section>

        <Section title="5. Changes to these Terms">
          <P>We may update these Terms from time to time. If we make material changes, we may notify you in the service or by other reasonable means.</P>
          <P>Continued use of Crossbench after updated Terms take effect means you accept the changes.</P>
        </Section>

        <Section title="6. Ending or suspending access">
          <P>You may stop using Crossbench at any time. We may suspend or end your access if you breach these Terms, to protect the platform, or if required by law.</P>
        </Section>

        <Section title="7. Governing law and disputes">
          <P>These Terms are governed by the laws of <strong style={{ color: '#F5F7FB' }}>Australia</strong>. If there is a dispute, both parties agree to try to resolve it in good faith first.</P>
        </Section>

        <Section title="8. Contact">
          <P>Questions about these Terms, or to report suspected account compromise:</P>
          <a href="mailto:security@crossbench.io" style={{ color: '#2E8B57', fontWeight: 600, textDecoration: 'none', fontSize: '15px' }}>
            security@crossbench.io
          </a>
        </Section>

        {/* Footer nav */}
        <div style={{ borderTop: '1px solid #25324D', paddingTop: '32px', marginTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '20px' }}>
            <Link href="/privacy" style={{ color: '#7E8AA3', fontSize: '14px', textDecoration: 'none' }}>Privacy Policy</Link>
            <Link href="/about" style={{ color: '#7E8AA3', fontSize: '14px', textDecoration: 'none' }}>About</Link>
          </div>
          <p style={{ color: '#4A5568', fontSize: '13px', margin: 0, fontStyle: 'italic' }}>
            Your vote matters. Use it honestly.
          </p>
        </div>
      </div>
    </main>
  );
}
