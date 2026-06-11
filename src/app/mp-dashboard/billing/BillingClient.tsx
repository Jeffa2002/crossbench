'use client';

import Link from 'next/link';

const INCLUDED_FEATURES = [
  'Full constituent sentiment dashboard',
  'Per-bill breakdowns: electorate vs national',
  'Verified constituent signal separated from all votes',
  'Live bill-level participation data',
  'Email support during early access',
];

const FUTURE_OFFICE_FEATURES = [
  'Multi-staffer office access',
  'Exports and briefing packs',
  'Weekly digest and issue alerts',
  'Historical trend reporting',
  'Custom onboarding for offices',
];

export default function BillingClient() {
  return (
    <div className="page-container">
      <Link href="/mp-dashboard" style={{ color: '#2E8B57', fontSize: '13px', textDecoration: 'none', display: 'block', marginBottom: '32px' }}>
        ← Back to dashboard
      </Link>

      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '10px' }}>Free MP early access</h1>
        <p style={{ color: '#7E8AA3', fontSize: '15px', maxWidth: '620px', lineHeight: 1.6 }}>
          MP and Senator dashboards are free while Crossbench builds enough verified constituent participation to reach critical mass. No credit card is required.
        </p>
      </div>

      <div style={{ backgroundColor: '#0D2818', border: '1px solid #2E8B57', borderRadius: '14px', padding: '28px', marginBottom: '20px' }}>
        <div style={{ color: '#2E8B57', fontSize: '12px', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>
          Active now
        </div>
        <h2 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 8px' }}>Full dashboard access</h2>
        <p style={{ color: '#B6C0D1', fontSize: '14px', lineHeight: 1.6, margin: '0 0 20px' }}>
          Your office can use the core dashboard without subscribing. Paid plans will only be introduced later for advanced office workflow features.
        </p>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '8px' }}>
          {INCLUDED_FEATURES.map(feature => (
            <li key={feature} style={{ display: 'flex', gap: '8px', color: '#B6C0D1', fontSize: '14px' }}>
              <span style={{ color: '#2E8B57', fontWeight: 700 }}>✓</span>
              {feature}
            </li>
          ))}
        </ul>
      </div>

      <div style={{ backgroundColor: '#111A2E', border: '1px solid #25324D', borderRadius: '12px', padding: '24px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 8px' }}>Possible paid office features later</h3>
        <p style={{ color: '#7E8AA3', fontSize: '13px', margin: '0 0 16px', lineHeight: 1.6 }}>
          These are deliberately not required for access now. They are the sort of higher-value tools that can become paid once Crossbench has enough participation.
        </p>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '8px' }}>
          {FUTURE_OFFICE_FEATURES.map(feature => (
            <li key={feature} style={{ display: 'flex', gap: '8px', color: '#7E8AA3', fontSize: '13px' }}>
              <span style={{ color: '#4A5568', fontWeight: 700 }}>•</span>
              {feature}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
