import Link from 'next/link';
import Image from 'next/image';

export default function Footer() {
  return (
    <footer style={{
      borderTop: '1px solid #25324D',
      backgroundColor: '#0B1220',
      marginTop: 'auto',
      padding: '32px 24px',
    }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            {/* Icon-only crop: show left ~29% of the logo (the ballot box + chat icon) */}
            <div style={{ width: '32px', height: '32px', overflow: 'hidden', position: 'relative', borderRadius: '4px' }}>
              <Image
                src="/logo.jpg"
                alt="Crossbench"
                width={679}
                height={198}
                style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', height: '32px', width: 'auto' }}
              />
            </div>
          </Link>
          <span style={{ color: '#4A5568', fontSize: '13px' }}>Your voice. Your electorate. Your Parliament.</span>
        </div>
        <nav style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          <Link href="/about" style={{ color: '#7E8AA3', fontSize: '13px', textDecoration: 'none' }}>About</Link>
          <Link href="/privacy" style={{ color: "#7E8AA3", fontSize: "13px", textDecoration: "none" }}>Privacy Policy</Link>
          <Link href="/terms" style={{ color: "#7E8AA3", fontSize: "13px", textDecoration: "none" }}>Terms</Link>
          <a href="mailto:privacy@crossbench.io" style={{ color: '#7E8AA3', fontSize: '13px', textDecoration: 'none' }}>Contact</a>
        </nav>
        <p style={{ color: '#4A5568', fontSize: '12px', margin: 0 }}>
          © {new Date().getFullYear()} Crossbench. Not affiliated with the Australian Parliament.
        </p>
      </div>
    </footer>
  );
}
