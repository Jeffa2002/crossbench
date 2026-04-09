import Link from 'next/link';

export default function Footer() {
  return (
    <footer style={{
      borderTop: '1px solid #25324D',
      backgroundColor: '#0B1220',
      marginTop: 'auto',
      padding: '32px 24px',
    }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontWeight: 700, color: '#F5F7FB', fontSize: '14px' }}>Crossbench</span>
          <span style={{ color: '#4A5568', fontSize: '13px' }}>— Your voice. Your electorate. Your Parliament.</span>
        </div>
        <nav style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          <Link href="/about" style={{ color: '#7E8AA3', fontSize: '13px', textDecoration: 'none' }}>About</Link>
          <Link href="/privacy" style={{ color: '#7E8AA3', fontSize: '13px', textDecoration: 'none' }}>Privacy Policy</Link>
          <a href="mailto:privacy@crossbench.io" style={{ color: '#7E8AA3', fontSize: '13px', textDecoration: 'none' }}>Contact</a>
        </nav>
        <p style={{ color: '#4A5568', fontSize: '12px', margin: 0 }}>
          © {new Date().getFullYear()} Crossbench. Not affiliated with the Australian Parliament.
        </p>
      </div>
    </footer>
  );
}
