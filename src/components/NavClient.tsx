'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

type NavClientProps = {
  isLoggedIn: boolean;
};

const NAV_LINKS = [
  { href: '/bills', label: 'Bills' },
  { href: '/sentiment', label: 'Sentiment' },
  { href: '/stats', label: 'Stats' },
  { href: '/parliament', label: 'Parliament' },
  { href: '/electorates', label: 'Electorates' },
  { href: '/about', label: 'About' },
];

export default function NavClient({ isLoggedIn }: NavClientProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close drawer on route change
  useEffect(() => { setOpen(false); }, [pathname]);

  // Lock body scroll when drawer open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <header style={{ backgroundColor: '#0B1220', borderBottom: '1px solid #25324D', position: 'sticky', top: 0, zIndex: 50 }}>
      <div className="nav-inner">
        {/* Logo */}
        <Link href="/" style={{ textDecoration: 'none', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
          <Image src="/logo.jpg" alt="Crossbench" width={160} height={47} style={{ height: '36px', width: 'auto', display: 'block' }} priority />
        </Link>

        {/* Desktop nav */}
        <nav className="nav-links nav-desktop">
          {NAV_LINKS.map(({ href, label }) => (
            <Link key={href} href={href} className="nav-link">{label}</Link>
          ))}
          {isLoggedIn ? (
            <>
              <Link href="/dashboard" className="nav-link">Dashboard</Link>
              <Link href="/account" className="nav-cta">Account</Link>
            </>
          ) : (
            <Link href="/login" className="nav-cta">Sign in</Link>
          )}
        </nav>

        {/* Hamburger button — mobile only */}
        <button
          onClick={() => setOpen(o => !o)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          className="nav-hamburger"
          style={{
            display: 'none', // shown via CSS on mobile
            flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
            gap: '5px', background: 'none', border: 'none', cursor: 'pointer',
            padding: '8px', borderRadius: '6px',
          }}
        >
          <span style={{ display: 'block', width: '22px', height: '2px', backgroundColor: open ? '#F5F7FB' : '#B6C0D1', borderRadius: '2px', transition: 'transform 0.2s, opacity 0.2s', transform: open ? 'rotate(45deg) translate(5px, 5px)' : 'none' }} />
          <span style={{ display: 'block', width: '22px', height: '2px', backgroundColor: open ? '#F5F7FB' : '#B6C0D1', borderRadius: '2px', transition: 'opacity 0.2s', opacity: open ? 0 : 1 }} />
          <span style={{ display: 'block', width: '22px', height: '2px', backgroundColor: open ? '#F5F7FB' : '#B6C0D1', borderRadius: '2px', transition: 'transform 0.2s, opacity 0.2s', transform: open ? 'rotate(-45deg) translate(5px, -5px)' : 'none' }} />
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: '60px 0 0 0', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 40 }}
          />
          {/* Drawer */}
          <nav style={{
            position: 'fixed', top: '60px', left: 0, right: 0,
            backgroundColor: '#0B1220', borderBottom: '1px solid #25324D',
            zIndex: 50, padding: '8px 16px 20px', display: 'flex', flexDirection: 'column', gap: '2px',
          }}>
            {NAV_LINKS.map(({ href, label }) => (
              <Link key={href} href={href} style={{
                color: pathname === href ? '#F5F7FB' : '#B6C0D1',
                fontSize: '15px', padding: '12px 8px',
                borderRadius: '6px', textDecoration: 'none',
                borderBottom: '1px solid #1A2540',
                backgroundColor: pathname === href ? '#111A2E' : 'transparent',
              }}>{label}</Link>
            ))}
            <div style={{ marginTop: '8px' }}>
              {isLoggedIn ? (
                <>
                  <Link href="/dashboard" style={{ display: 'block', color: '#B6C0D1', fontSize: '15px', padding: '12px 8px', borderRadius: '6px', textDecoration: 'none', borderBottom: '1px solid #1A2540' }}>Dashboard</Link>
                  <Link href="/account" style={{ display: 'block', marginTop: '10px', backgroundColor: '#2E8B57', color: '#fff', fontSize: '14px', padding: '12px 16px', borderRadius: '8px', textDecoration: 'none', fontWeight: 600, textAlign: 'center' }}>Account</Link>
                </>
              ) : (
                <Link href="/login" style={{ display: 'block', marginTop: '10px', backgroundColor: '#2E8B57', color: '#fff', fontSize: '14px', padding: '12px 16px', borderRadius: '8px', textDecoration: 'none', fontWeight: 600, textAlign: 'center' }}>Sign in</Link>
              )}
            </div>
          </nav>
        </>
      )}
    </header>
  );
}
