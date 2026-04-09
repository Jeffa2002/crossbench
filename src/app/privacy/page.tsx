import Nav from '@/components/Nav';
import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy | Crossbench',
  description: 'How Crossbench collects, uses, and protects your personal information under the Privacy Act 1988 (Cth).',
};

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

function Highlight({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ backgroundColor: 'rgba(46,139,87,0.15)', color: '#2E8B57', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
      {children}
    </span>
  );
}

export default function PrivacyPage() {
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
            Privacy Policy
          </h1>
          <p style={{ color: '#7E8AA3', fontSize: '14px', margin: 0 }}>
            Effective date: 9 April 2026
          </p>
        </div>

        {/* Intro */}
        <div style={{ backgroundColor: '#111A2E', border: '1px solid #25324D', borderRadius: '12px', padding: '24px', marginBottom: '40px' }}>
          <p style={{ color: '#B6C0D1', fontSize: '15px', lineHeight: '1.7', margin: 0 }}>
            Crossbench is a civic tech platform that helps Australians vote on parliamentary bills, verify their electorate, and see how their views compare with others in their electorate. This Privacy Policy explains how we collect, use, store, share, and protect personal information in line with the{' '}
            <Highlight>Privacy Act 1988 (Cth)</Highlight> and the <Highlight>Australian Privacy Principles (APPs)</Highlight>.
          </p>
        </div>

        {/* Collection Notice callout */}
        <div style={{
          backgroundColor: 'rgba(46,139,87,0.08)', border: '1px solid rgba(46,139,87,0.25)',
          borderRadius: '12px', padding: '20px 24px', marginBottom: '40px'
        }}>
          <p style={{ fontSize: '13px', fontWeight: 700, color: '#2E8B57', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Collection Notice (APP 5 Summary)
          </p>
          <p style={{ color: '#B6C0D1', fontSize: '14px', lineHeight: '1.65', margin: 0 }}>
            Crossbench collects your <strong style={{ color: '#F5F7FB' }}>email address</strong> and <strong style={{ color: '#F5F7FB' }}>address</strong> to verify your electorate and record your votes on parliamentary bills. We store a <strong style={{ color: '#F5F7FB' }}>one-way hash</strong> of your address — never the raw address. Your votes are linked to your electorate and shown to MPs as <strong style={{ color: '#F5F7FB' }}>aggregated, anonymised data</strong> — your name is never attached to your vote. We use session cookies only. Contact us at{' '}
            <a href="mailto:privacy@crossbench.io" style={{ color: '#2E8B57', textDecoration: 'none' }}>privacy@crossbench.io</a>.
          </p>
        </div>

        <Section title="1. Who we are">
          <P>Crossbench operates the website and related services at <strong style={{ color: '#F5F7FB' }}>crossbench.io</strong>.</P>
          <P>If you have questions about privacy, contact us at <a href="mailto:privacy@crossbench.io" style={{ color: '#2E8B57', textDecoration: 'none' }}>privacy@crossbench.io</a>.</P>
        </Section>

        <Section title="2. What we collect">
          <P>We collect only what we need to run the service and show electorate-level voting data.</P>
          <ul style={{ margin: '0 0 12px', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              ['Email address', 'To create and manage your account'],
              ['Address information', 'Used temporarily to verify your electorate'],
              ['A one-way hash of your address', 'We never store your raw address in readable form — only a hash used for electorate matching'],
              ['Electorate assignment', 'Which federal electorate you belong to'],
              ['Voting history', 'Your Support, Oppose, or Abstain choices on bills'],
              ['Session information', 'Cookies used to keep you signed in'],
              ['Basic technical data', 'Browser, device, and log data for security and reliability'],
            ].map(([label, desc]) => (
              <li key={label} style={{ color: '#B6C0D1' }}>
                <strong style={{ color: '#F5F7FB' }}>{label}</strong> — {desc}
              </li>
            ))}
          </ul>
        </Section>

        <Section title="3. Why we collect it">
          <P>We collect and use your information to:</P>
          <ul style={{ margin: '0 0 12px', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {[
              'Create and manage your account',
              'Verify the electorate you belong to',
              'Record your votes on bills',
              'Show aggregate and anonymised electorate opinion to MPs and the public',
              'Keep the platform secure and reliable',
              'Meet legal and operational requirements',
            ].map(item => <li key={item}>{item}</li>)}
          </ul>
          <P>Crossbench is designed to support verified democratic participation. Your vote helps build a real-time picture of constituent opinion by electorate.</P>
        </Section>

        <Section title="4. How we use address information">
          <P>To verify your electorate, we ask for your address. We do <strong style={{ color: '#F5F7FB' }}>not</strong> store your raw address as a readable record. Instead, we store a <strong style={{ color: '#F5F7FB' }}>one-way hash</strong> and use it to match your address to the correct electorate.</P>
          <P>This helps us verify electorate membership while reducing unnecessary storage of personal information.</P>
        </Section>

        <Section title="5. How we store and protect information">
          <P>We store information in a <strong style={{ color: '#F5F7FB' }}>PostgreSQL database</strong> hosted on <strong style={{ color: '#F5F7FB' }}>Australian infrastructure</strong>.</P>
          <P>We take reasonable steps to protect personal information from misuse, interference, loss, unauthorised access, modification, or disclosure — including access controls, secure infrastructure, and operational safeguards.</P>
          <P>No online system is completely secure, but we work to protect your information responsibly.</P>
        </Section>

        <Section title="6. Who we share it with">
          <P>We do <strong style={{ color: '#F5F7FB' }}>not</strong> attribute individual votes to people by name when sharing results.</P>
          <P>What MPs and the public can see:</P>
          <ul style={{ margin: '0 0 12px', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <li>Aggregated vote results (e.g. "64% of Grayndler supports this bill")</li>
            <li>Anonymised electorate-level opinion data</li>
          </ul>
          <P>We may share information with trusted service providers (hosting, database) who help us run Crossbench. We may also share or commercialise <strong style={{ color: '#F5F7FB' }}>aggregated, anonymised vote and electorate data</strong> — for example, how an electorate voted on a bill. We will <strong style={{ color: '#F5F7FB' }}>never sell personal information</strong> such as your name, email address, or address hash.</P>
        </Section>

        <Section title="7. Cookies">
          <P>Crossbench uses <strong style={{ color: '#F5F7FB' }}>session cookies only</strong>, including cookies used by our authentication system to keep you signed in.</P>
          <P>We do <strong style={{ color: '#F5F7FB' }}>not</strong> use advertising cookies or tracking cookies.</P>
        </Section>

        <Section title="8. Data retention">
          <P>Votes are kept as part of the civic record so Crossbench can show how opinion changes over time. Voting history may be retained indefinitely.</P>
          <P>If you close your account, you can ask us to delete your account information. We will remove personal information where lawful and practicable, while preserving the integrity of the civic record and meeting legal obligations.</P>
        </Section>

        <Section title="9. Your rights">
          <P>You can ask us to:</P>
          <ul style={{ margin: '0 0 12px', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <li>Access the personal information we hold about you</li>
            <li>Correct information that is inaccurate, out of date, or incomplete</li>
            <li>Delete your account and related personal information, where possible</li>
          </ul>
          <P>To make a request, email <a href="mailto:privacy@crossbench.io" style={{ color: '#2E8B57', textDecoration: 'none' }}>privacy@crossbench.io</a>. We may need to verify your identity first.</P>
        </Section>

        <Section title="10. Complaints">
          <P>If you have a privacy complaint, contact us first at <a href="mailto:privacy@crossbench.io" style={{ color: '#2E8B57', textDecoration: 'none' }}>privacy@crossbench.io</a>. We'll review your complaint and respond promptly.</P>
          <P>If you're not satisfied with our response, you may contact the <strong style={{ color: '#F5F7FB' }}>Office of the Australian Information Commissioner (OAIC)</strong> at <a href="https://www.oaic.gov.au" target="_blank" rel="noopener noreferrer" style={{ color: '#2E8B57', textDecoration: 'none' }}>oaic.gov.au</a>.</P>
        </Section>

        <Section title="11. Changes to this policy">
          <P>We may update this Privacy Policy from time to time. If we make a material change, we will take reasonable steps to notify you.</P>
        </Section>

        {/* Footer CTA */}
        <div style={{ borderTop: '1px solid #25324D', paddingTop: '32px', marginTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <p style={{ color: '#7E8AA3', fontSize: '14px', margin: '0 0 4px' }}>Privacy questions?</p>
            <a href="mailto:privacy@crossbench.io" style={{ color: '#2E8B57', fontWeight: 600, textDecoration: 'none', fontSize: '15px' }}>
              privacy@crossbench.io
            </a>
          </div>
          <Link href="/about" style={{ color: '#7E8AA3', fontSize: '14px', textDecoration: 'none' }}>
            ← Back to About
          </Link>
        </div>
      </div>
    </main>
  );
}
