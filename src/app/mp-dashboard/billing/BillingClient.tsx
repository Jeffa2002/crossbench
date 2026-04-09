'use client';

import { useState } from 'react';
import Link from 'next/link';

const PLANS = [
  {
    tier: 'PRO',
    name: 'Pro',
    price: '$199',
    period: '/month',
    highlight: true,
    badge: 'Most popular',
    features: [
      'Full constituent sentiment dashboard',
      'Per-bill breakdowns — electorate vs national',
      'Trend data over time',
      'CSV export of electorate data',
      'Weekly email digest',
      'Unlimited historical data',
      '1 user login',
    ],
  },
  {
    tier: 'TEAM',
    name: 'Team',
    price: '$499',
    period: '/month',
    highlight: false,
    badge: null,
    features: [
      'Everything in Pro',
      'Up to 3 staff logins',
      'API access for your team',
      'Branded PDF reports',
      'Priority support',
      'Custom data requests',
    ],
  },
];

export default function BillingClient() {
  const [loading, setLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  async function handleSubscribe(tier: string) {
    setLoading(tier);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      });
      const { url, error } = await res.json();
      if (error) { alert(error); setLoading(null); return; }
      window.location.href = url;
    } catch {
      alert('Something went wrong. Please try again.');
      setLoading(null);
    }
  }

  async function handlePortal() {
    setPortalLoading(true);
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' });
      const { url, error } = await res.json();
      if (error) { alert(error); setPortalLoading(false); return; }
      window.location.href = url;
    } catch {
      alert('Something went wrong.');
      setPortalLoading(false);
    }
  }

  return (
    <div className="page-container">
      <Link href="/mp-dashboard" style={{ color: '#2E8B57', fontSize: '13px', textDecoration: 'none', display: 'block', marginBottom: '32px' }}>
        ← Back to dashboard
      </Link>

      <div style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '10px' }}>Crossbench for MPs</h1>
        <p style={{ color: '#7E8AA3', fontSize: '15px', maxWidth: '540px', lineHeight: 1.6 }}>
          Real-time constituent sentiment for your electorate. The only tool that tells you what your community actually thinks about legislation — before the media does.
        </p>
      </div>

      {/* Plans */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '40px' }}>
        {PLANS.map(plan => (
          <div key={plan.tier} style={{
            backgroundColor: '#111A2E',
            border: plan.highlight ? '2px solid #2E8B57' : '1px solid #25324D',
            borderRadius: '14px', padding: '28px', position: 'relative',
          }}>
            {plan.badge && (
              <div style={{
                position: 'absolute', top: '-13px', left: '24px',
                backgroundColor: '#2E8B57', color: '#fff',
                fontSize: '11px', fontWeight: 700, padding: '3px 12px', borderRadius: '20px',
              }}>
                {plan.badge}
              </div>
            )}

            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '4px' }}>{plan.name}</h2>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '20px' }}>
              <span style={{ fontSize: '36px', fontWeight: 700, color: '#D6A94A' }}>{plan.price}</span>
              <span style={{ color: '#7E8AA3', fontSize: '14px' }}>{plan.period}</span>
            </div>

            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {plan.features.map(f => (
                <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '14px', color: '#B6C0D1' }}>
                  <span style={{ color: '#2E8B57', flexShrink: 0, marginTop: '1px' }}>✓</span>
                  {f}
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleSubscribe(plan.tier)}
              disabled={loading !== null}
              style={{
                width: '100%', padding: '12px', borderRadius: '8px', fontWeight: 700,
                fontSize: '14px', cursor: loading ? 'not-allowed' : 'pointer', border: 'none',
                backgroundColor: plan.highlight ? '#2E8B57' : '#16213A',
                color: plan.highlight ? '#fff' : '#B6C0D1',
                opacity: loading && loading !== plan.tier ? 0.5 : 1,
              }}
            >
              {loading === plan.tier ? 'Redirecting...' : `Subscribe to ${plan.name}`}
            </button>
          </div>
        ))}
      </div>

      {/* Manage existing subscription */}
      <div style={{ backgroundColor: '#111A2E', border: '1px solid #25324D', borderRadius: '12px', padding: '24px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 8px' }}>Already subscribed?</h3>
        <p style={{ color: '#7E8AA3', fontSize: '13px', margin: '0 0 16px' }}>
          Manage your subscription, update payment details, or download invoices.
        </p>
        <button
          onClick={handlePortal}
          disabled={portalLoading}
          style={{
            backgroundColor: 'transparent', border: '1px solid #25324D', color: '#B6C0D1',
            padding: '10px 20px', borderRadius: '8px', fontWeight: 600, fontSize: '13px',
            cursor: portalLoading ? 'not-allowed' : 'pointer',
          }}
        >
          {portalLoading ? 'Loading...' : 'Open billing portal →'}
        </button>
      </div>

      <p style={{ color: '#4A5568', fontSize: '12px', marginTop: '24px', textAlign: 'center' }}>
        30-day free trial included · Cancel anytime · Secured by Stripe
      </p>
    </div>
  );
}
