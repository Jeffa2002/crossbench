'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type DashboardData = {
  electorate: { name: string; state: string; mpName: string; mpParty: string; mpPhotoUrl: string | null };
  subscription: { status: string; tier: string; trialEndsAt: string | null; trialDaysLeft: number | null };
  overview: { totalVotes: number; supportPct: number; opposePct: number; abstainPct: number };
  bills: Array<{
    id: string; title: string; status: string;
    local: { total: number; supportPct: number; opposePct: number; abstainPct: number };
    national: { total: number; supportPct: number; opposePct: number; abstainPct: number };
  }>;
};

const PARTY_COLORS: Record<string, string> = {
  labor: '#E53E3E', liberal: '#3182CE', national: '#38A169',
  greens: '#48BB78', independent: '#805AD5', teal: '#319795',
};

function partyColor(p: string | null) {
  if (!p) return '#6F7D95';
  const lower = p.toLowerCase();
  for (const [k, v] of Object.entries(PARTY_COLORS)) if (lower.includes(k)) return v;
  return '#6F7D95';
}

function Bar({ pct, color, label }: { pct: number; color: string; label: string }) {
  return (
    <div style={{ marginBottom: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontSize: '13px', color: '#B6C0D1' }}>{label}</span>
        <span style={{ fontSize: '13px', fontWeight: 700, color }}>{pct}%</span>
      </div>
      <div style={{ height: '8px', backgroundColor: '#16213A', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, backgroundColor: color, borderRadius: '4px', transition: 'width 0.6s ease' }} />
      </div>
    </div>
  );
}

export default function MpDashboardClient() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/mp/dashboard')
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); setLoading(false); return; }
        setData(d);
        setLoading(false);
      })
      .catch(() => { setError('Failed to load dashboard'); setLoading(false); });
  }, []);

  const isLocked = data?.subscription?.status === 'CANCELLED' ||
    (data?.subscription?.status === 'TRIAL' && (data?.subscription?.trialDaysLeft ?? 0) < 0);

  return (
    <div className="page-container">

      {loading && (
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#7E8AA3' }}>Loading your dashboard...</div>
      )}

      {!loading && error && (
        <div style={{ backgroundColor: '#111A2E', border: '1px solid #25324D', borderRadius: '12px', padding: '48px', textAlign: 'center' }}>
          <p style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>MPs only</p>
          <p style={{ color: '#7E8AA3', marginBottom: '24px' }}>
            This dashboard is for Members of Parliament. Sign in with your <code style={{ backgroundColor: '#16213A', padding: '2px 6px', borderRadius: '4px' }}>@aph.gov.au</code> email to access.
          </p>
          <Link href="/login" style={{ backgroundColor: '#2E8B57', color: '#fff', padding: '12px 24px', borderRadius: '8px', textDecoration: 'none', fontWeight: 600 }}>
            Sign in with APH email →
          </Link>
        </div>
      )}

      {!loading && data && (
        <>
          {/* Trial banner */}
          {data.subscription.status === 'TRIAL' && (data.subscription.trialDaysLeft ?? 0) >= 0 && (
            <div style={{
              backgroundColor: 'rgba(214,169,74,0.12)', border: '1px solid rgba(214,169,74,0.3)',
              borderRadius: '10px', padding: '14px 18px', marginBottom: '20px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px'
            }}>
              <div>
                <span style={{ color: '#D6A94A', fontWeight: 700, fontSize: '14px' }}>
                  🎁 Free trial — {data.subscription.trialDaysLeft} day{data.subscription.trialDaysLeft !== 1 ? 's' : ''} remaining
                </span>
                <p style={{ color: '#7E8AA3', fontSize: '13px', margin: '2px 0 0' }}>
                  Full Pro access included. Subscribe before your trial ends.
                </p>
              </div>
              <Link href="/mp-dashboard/billing" style={{
                backgroundColor: '#D6A94A', color: '#0B1220', padding: '8px 18px',
                borderRadius: '8px', fontWeight: 700, fontSize: '13px', textDecoration: 'none', flexShrink: 0
              }}>
                Subscribe now
              </Link>
            </div>
          )}

          {/* Past due banner */}
          {data.subscription.status === 'PAST_DUE' && (
            <div style={{
              backgroundColor: 'rgba(217,92,75,0.12)', border: '1px solid rgba(217,92,75,0.3)',
              borderRadius: '10px', padding: '14px 18px', marginBottom: '20px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px'
            }}>
              <span style={{ color: '#D95C4B', fontWeight: 700 }}>⚠️ Payment overdue — update your billing to restore access</span>
              <Link href="/mp-dashboard/billing" style={{
                backgroundColor: '#D95C4B', color: '#fff', padding: '8px 18px',
                borderRadius: '8px', fontWeight: 700, fontSize: '13px', textDecoration: 'none'
              }}>
                Fix billing →
              </Link>
            </div>
          )}

          {/* MP header card */}
          <div style={{ backgroundColor: '#111A2E', border: '1px solid #25324D', borderRadius: '12px', padding: '24px', marginBottom: '16px' }}>
            <div className="mp-header">
              {data.electorate.mpPhotoUrl && (
                <img src={data.electorate.mpPhotoUrl} alt={data.electorate.mpName}
                  style={{ width: '80px', height: '98px', borderRadius: '8px', objectFit: 'cover', objectPosition: 'top', border: '2px solid #25324D', flexShrink: 0 }} />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
                  <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#F5F7FB', margin: 0 }}>{data.electorate.mpName}</h1>
                  <span style={{
                    backgroundColor: `${partyColor(data.electorate.mpParty)}22`,
                    color: partyColor(data.electorate.mpParty),
                    fontSize: '12px', padding: '2px 10px', borderRadius: '20px',
                    fontWeight: 700, border: `1px solid ${partyColor(data.electorate.mpParty)}44`
                  }}>{data.electorate.mpParty}</span>
                </div>
                <p style={{ color: '#7E8AA3', fontSize: '14px', margin: '0 0 10px' }}>
                  Division of {data.electorate.name} · {data.electorate.state}
                </p>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{
                    backgroundColor: data.subscription.status === 'ACTIVE' ? 'rgba(46,139,87,0.15)' : 'rgba(214,169,74,0.15)',
                    color: data.subscription.status === 'ACTIVE' ? '#2E8B57' : '#D6A94A',
                    fontSize: '11px', padding: '3px 10px', borderRadius: '20px', fontWeight: 600,
                    border: `1px solid ${data.subscription.status === 'ACTIVE' ? 'rgba(46,139,87,0.3)' : 'rgba(214,169,74,0.3)'}`
                  }}>
                    {data.subscription.status === 'ACTIVE' ? `✓ ${data.subscription.tier} Plan` :
                     data.subscription.status === 'TRIAL' ? `Trial · ${data.subscription.trialDaysLeft}d left` :
                     data.subscription.status === 'PAST_DUE' ? '⚠ Payment due' : 'Inactive'}
                  </span>
                  <Link href="/mp-dashboard/billing" style={{ fontSize: '12px', color: '#7E8AA3', textDecoration: 'none' }}>
                    Manage billing →
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Paywall */}
          {isLocked ? (
            <div style={{ backgroundColor: '#111A2E', border: '1px solid #25324D', borderRadius: '12px', padding: '48px', textAlign: 'center' }}>
              <p style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>Subscribe to access your constituent data</p>
              <p style={{ color: '#7E8AA3', maxWidth: '480px', margin: '0 auto 28px', lineHeight: 1.6 }}>
                Real-time constituent sentiment — the only tool of its kind in Australian politics.
              </p>
              <Link href="/mp-dashboard/billing" style={{
                backgroundColor: '#2E8B57', color: '#fff', padding: '14px 32px',
                borderRadius: '8px', fontWeight: 700, fontSize: '15px', textDecoration: 'none'
              }}>
                View plans →
              </Link>
            </div>
          ) : (
            <>
              {/* Overview stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
                {[
                  { label: 'Constituent votes', value: data.overview.totalVotes.toLocaleString(), sub: 'across all bills' },
                  { label: 'Majority position', value: data.overview.supportPct >= data.overview.opposePct ? 'Support' : 'Oppose', sub: `${Math.max(data.overview.supportPct, data.overview.opposePct)}% of votes` },
                  { label: 'Bills with feedback', value: String(data.bills.length), sub: 'in your electorate' },
                ].map(({ label, value, sub }) => (
                  <div key={label} style={{ backgroundColor: '#111A2E', border: '1px solid #25324D', borderRadius: '10px', padding: '16px' }}>
                    <p style={{ fontSize: '11px', color: '#7E8AA3', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
                    <p style={{ fontSize: '22px', fontWeight: 700, color: '#D6A94A', margin: '0 0 2px' }}>{value}</p>
                    <p style={{ fontSize: '12px', color: '#4A5568', margin: 0 }}>{sub}</p>
                  </div>
                ))}
              </div>

              {/* Overall sentiment */}
              <div style={{ backgroundColor: '#111A2E', border: '1px solid #25324D', borderRadius: '12px', padding: '24px', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#F5F7FB', margin: '0 0 16px' }}>
                  Overall constituent sentiment — {data.electorate.name}
                </h2>
                <Bar pct={data.overview.supportPct} color="#2E8B57" label="Support" />
                <Bar pct={data.overview.opposePct} color="#D95C4B" label="Oppose" />
                <Bar pct={data.overview.abstainPct} color="#6F7D95" label="Abstain" />
                {data.overview.totalVotes === 0 && (
                  <p style={{ color: '#4A5568', fontSize: '13px', marginTop: '12px' }}>
                    No constituent votes yet. Share Crossbench with your electorate to start collecting data.
                  </p>
                )}
              </div>

              {/* Per-bill */}
              {data.bills.length > 0 && (
                <div>
                  <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#F5F7FB', margin: '0 0 12px' }}>
                    {data.electorate.name} vs national — by bill
                  </h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {data.bills.map(bill => {
                      const localDom = bill.local.supportPct >= bill.local.opposePct ? { label: 'Support', pct: bill.local.supportPct, color: '#2E8B57' }
                        : bill.local.opposePct >= bill.local.abstainPct ? { label: 'Oppose', pct: bill.local.opposePct, color: '#D95C4B' }
                        : { label: 'Abstain', pct: bill.local.abstainPct, color: '#6F7D95' };
                      const natlDom = bill.national.supportPct >= bill.national.opposePct ? 'Support'
                        : bill.national.opposePct >= bill.national.abstainPct ? 'Oppose' : 'Abstain';
                      const aligned = localDom.label === natlDom;

                      return (
                        <div key={bill.id} style={{ backgroundColor: '#111A2E', border: '1px solid #25324D', borderRadius: '10px', padding: '18px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '14px' }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <Link href={`/bills/${bill.id}`} style={{ fontSize: '14px', fontWeight: 600, color: '#F5F7FB', textDecoration: 'none', display: 'block', marginBottom: '3px', lineHeight: 1.4 }}>
                                {bill.title}
                              </Link>
                              <p style={{ fontSize: '11px', color: '#7E8AA3', margin: 0 }}>
                                {bill.status} · {bill.local.total} constituent{bill.local.total !== 1 ? 's' : ''} voted
                              </p>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                              <span style={{
                                fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px',
                                backgroundColor: aligned ? 'rgba(46,139,87,0.15)' : 'rgba(217,92,75,0.15)',
                                color: aligned ? '#2E8B57' : '#D95C4B',
                                border: `1px solid ${aligned ? 'rgba(46,139,87,0.3)' : 'rgba(217,92,75,0.3)'}`
                              }}>
                                {aligned ? '≈ With nation' : '≠ Against trend'}
                              </span>
                              <span style={{ fontSize: '11px', color: localDom.color, fontWeight: 700 }}>
                                {localDom.pct}% {localDom.label}
                              </span>
                            </div>
                          </div>

                          <div className="compare-grid">
                            {[
                              { label: `📍 ${data.electorate.name}`, d: bill.local },
                              { label: '🇦🇺 National avg', d: bill.national },
                            ].map(({ label, d }) => (
                              <div key={label}>
                                <p style={{ fontSize: '10px', color: '#3A4A6A', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
                                {[
                                  { pos: 'Support', pct: d.supportPct, color: '#2E8B57' },
                                  { pos: 'Oppose', pct: d.opposePct, color: '#D95C4B' },
                                  { pos: 'Abstain', pct: d.abstainPct, color: '#6F7D95' },
                                ].map(({ pos, pct, color }) => (
                                  <div key={pos} style={{ marginBottom: '5px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                                      <span style={{ fontSize: '11px', color: '#7E8AA3' }}>{pos}</span>
                                      <span style={{ fontSize: '11px', color, fontWeight: 600 }}>{pct}%</span>
                                    </div>
                                    <div style={{ height: '4px', backgroundColor: '#16213A', borderRadius: '2px', overflow: 'hidden' }}>
                                      <div style={{ height: '100%', width: `${pct}%`, backgroundColor: color, borderRadius: '2px' }} />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
