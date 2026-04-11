'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Composition {
  label: string;
  dates: string;
  hor: Record<string, number>;
  senate: Record<string, number>;
}

interface StatsData {
  totals: { all: number; passed: number; notPassed: number; before: number };
  passRate: number;
  timing: {
    avg: number | null; median: number | null;
    fastest: { days: number; title: string; id: string } | null;
    slowest: { days: number; title: string; id: string } | null;
    count: number;
  };
  divisions: {
    passedWithFormal: number; passedByVoice: number;
    mostContested: Array<{ count: number; title: string; id: string }>;
  };
  origin: { house: number; senate: number };
  parliament: number | null;
  parliaments: number[];
  composition: Composition | null;
}

const PARTY_COLORS: Record<string, string> = {
  'Australian Labor Party': '#E53935',
  'Liberal Party': '#1565C0',
  'Liberal National Party': '#1976D2',
  'National Party': '#2E7D32',
  'Australian Greens': '#43A047',
  "Pauline Hanson's One Nation Party": '#F57C00',
  "Katter's Australian Party": '#6D4C41',
  'Independent': '#78909C',
  'Jacqui Lambie Network': '#7B1FA2',
  'United Australia Party': '#FFD600',
  'Country Liberal Party': '#0288D1',
  'Centre Alliance': '#00897B',
};

const PARLIAMENT_LABELS: Record<number, string> = {
  48: '48th Parliament',
  47: '47th Parliament',
  46: '46th Parliament',
};

function partyColor(party: string) {
  return PARTY_COLORS[party] || '#4E5A73';
}

function KpiCard({ value, label, sub, color }: { value: string | number; label: string; sub?: string; color?: string }) {
  return (
    <div style={{ backgroundColor: '#0E1628', border: '1px solid #1C2940', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{ fontSize: '38px', fontWeight: 700, color: color || '#F5F7FB', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: '13px', fontWeight: 600, color: '#B6C0D1' }}>{label}</div>
      {sub && <div style={{ fontSize: '11px', color: '#4E5A73', lineHeight: '1.4' }}>{sub}</div>}
    </div>
  );
}

function DonutChart({ passed, notPassed, before, total, selectedParl }: { passed: number; notPassed: number; before: number; total: number; selectedParl: number | null }) {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const seg = (n: number) => (n / total) * circ;
  const passedSeg = seg(passed);
  const notPassedSeg = seg(notPassed);
  const beforeSeg = seg(before);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
      <svg width={124} height={124} viewBox="0 0 124 124" style={{ flexShrink: 0 }}>
        <circle cx={62} cy={62} r={r} fill="none" stroke="#1C2940" strokeWidth={14} />
        <circle cx={62} cy={62} r={r} fill="none" stroke="#2E8B57" strokeWidth={14}
          strokeDasharray={`${passedSeg} ${circ - passedSeg}`}
          style={{ transform: 'rotate(-90deg)', transformOrigin: '62px 62px' }} />
        <circle cx={62} cy={62} r={r} fill="none" stroke="#D95C4B" strokeWidth={14}
          strokeDasharray={`${notPassedSeg} ${circ - notPassedSeg}`}
          strokeDashoffset={-passedSeg}
          style={{ transform: 'rotate(-90deg)', transformOrigin: '62px 62px' }} />
        <circle cx={62} cy={62} r={r} fill="none" stroke="#2A3A5A" strokeWidth={14}
          strokeDasharray={`${beforeSeg} ${circ - beforeSeg}`}
          strokeDashoffset={-(passedSeg + notPassedSeg)}
          style={{ transform: 'rotate(-90deg)', transformOrigin: '62px 62px' }} />
        <text x={62} y={58} textAnchor="middle" fill="#F5F7FB" fontSize={19} fontWeight={700}>{Math.round((passed / total) * 100)}%</text>
        <text x={62} y={73} textAnchor="middle" fill="#7E8AA3" fontSize={10}>passed</text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {[
          { label: 'Became law', count: passed, color: '#2E8B57' },
          { label: selectedParl && selectedParl < 48 ? 'Lapsed' : 'Still before Parliament', count: before, color: '#2A3A5A' },
          { label: "Didn't pass", count: notPassed, color: '#D95C4B' },
        ].map(({ label, count, color }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: color, flexShrink: 0 }} />
            <span style={{ fontSize: '12px', color: '#B6C0D1' }}>{label}</span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#F5F7FB', marginLeft: 'auto', paddingLeft: '12px' }}>{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SeatsBar({ parties, total, chamber }: { parties: Record<string, number>; total: number; chamber: string }) {
  const sorted = Object.entries(parties).sort((a, b) => b[1] - a[1]);
  const majority = Math.floor(total / 2) + 1;

  // Build the stacked bar segments
  const segments = sorted.map(([party, seats]) => ({
    party, seats, pct: (seats / total) * 100, color: partyColor(party),
  }));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '10px' }}>
        <div style={{ fontSize: '11px', fontWeight: 600, color: '#7E8AA3', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{chamber}</div>
        <div style={{ fontSize: '11px', color: '#4E5A73' }}>{total} seats · majority = {majority}</div>
      </div>
      {/* Stacked bar */}
      <div style={{ height: '28px', borderRadius: '6px', overflow: 'hidden', display: 'flex', marginBottom: '14px', backgroundColor: '#1C2940' }}>
        {segments.map(({ party, pct, color }) => (
          <div key={party} title={`${party}: ${parties[party]}`}
            style={{ width: `${pct}%`, backgroundColor: color, transition: 'width 0.5s ease' }} />
        ))}
      </div>
      {/* Majority line indicator */}
      <div style={{ position: 'relative', height: '12px', marginTop: '-20px', marginBottom: '16px', pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', left: '50%', top: 0, width: '1px', height: '28px', backgroundColor: 'rgba(255,255,255,0.2)' }} />
      </div>
      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {segments.map(({ party, seats, color }) => (
          <div key={party} style={{ display: 'flex', alignItems: 'center', gap: '5px', backgroundColor: '#0A1020', border: '1px solid #1C2940', borderRadius: '5px', padding: '3px 8px' }}>
            <div style={{ width: 8, height: 8, borderRadius: '2px', backgroundColor: color, flexShrink: 0 }} />
            <span style={{ fontSize: '11px', color: '#8A96B0' }}>{party.replace('Australian ', '').replace(' of Australia', '')}</span>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#F5F7FB' }}>{seats}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecordCard({ label, badge, days, title, id, color }: { label: string; badge: string; days: number; title: string; id: string; color: string }) {
  const titleClean = title.replace(/\s+(Bill|Act)\s+\d{4}(-\d{4})?(\s+\(No\.\s*\d+\))?$/i, '').replace(/&rsquo;/g, "'").trim();
  return (
    <Link href={`/bills/${id}`} style={{ textDecoration: 'none' }}>
      <div style={{ backgroundColor: '#0E1628', border: `1px solid ${color}33`, borderRadius: '12px', padding: '20px', cursor: 'pointer' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{ fontSize: '10px', fontWeight: 600, color: '#4E5A73', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</span>
          <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', backgroundColor: `${color}22`, color, border: `1px solid ${color}44` }}>{badge}</span>
        </div>
        <div style={{ fontSize: '34px', fontWeight: 700, color, lineHeight: 1, marginBottom: '4px' }}>
          {days} <span style={{ fontSize: '15px', fontWeight: 400, color: '#7E8AA3' }}>days</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '10px 0' }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: color }} />
          <div style={{ flex: 1, height: 2, backgroundColor: '#1C2940', overflow: 'hidden', borderRadius: '2px' }}>
            <div style={{ height: '100%', width: '100%', backgroundColor: color, opacity: 0.35 }} />
          </div>
          <div style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: color }} />
        </div>
        <div style={{ fontSize: '12px', color: '#7E8AA3', lineHeight: '1.4' }}>{titleClean}</div>
      </div>
    </Link>
  );
}

function ContestCard({ rank, count, title, id }: { rank: number; count: number; title: string; id: string }) {
  const titleClean = title.replace(/\s+(Bill|Act)\s+\d{4}(-\d{4})?(\s+\(No\.\s*\d+\))?$/i, '').replace(/&rsquo;/g, "'").trim();
  return (
    <Link href={`/bills/${id}`} style={{ textDecoration: 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 0', borderBottom: '1px solid #1C2940' }}>
        <div style={{ fontSize: '16px', fontWeight: 700, color: '#3A4A6A', width: '22px', flexShrink: 0 }}>#{rank}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '12px', color: '#B6C0D1', lineHeight: '1.4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{titleClean}</div>
        </div>
        <div style={{ flexShrink: 0, textAlign: 'right' }}>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#F5F7FB' }}>{count}</div>
          <div style={{ fontSize: '10px', color: '#4E5A73' }}>divisions</div>
        </div>
      </div>
    </Link>
  );
}

export default function StatsPage() {
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedParl, setSelectedParl] = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    const url = selectedParl ? `/api/stats?parliament=${selectedParl}` : '/api/stats';
    fetch(url)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [selectedParl]);

  if (!data && loading) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#4E5A73', fontSize: '14px' }}>Loading stats…</div>
    </div>
  );
  if (!data) return null;

  const { totals, passRate, timing, divisions, origin, parliaments, composition } = data;

  const horTotal = composition ? Object.values(composition.hor).reduce((a, b) => a + b, 0) : 0;
  const senTotal = composition ? Object.values(composition.senate).reduce((a, b) => a + b, 0) : 0;

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 20px 80px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#F5F7FB', margin: '0 0 8px' }}>By the Numbers</h1>
        <p style={{ fontSize: '14px', color: '#7E8AA3', margin: '0 0 20px', lineHeight: '1.6' }}>
          How bills travel through Parliament — and how many make it to the finish line.
        </p>

        {/* Parliament filter tabs */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={() => setSelectedParl(null)}
            style={{ padding: '6px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', border: '1px solid', transition: 'all 0.15s',
              backgroundColor: selectedParl === null ? '#2563EB' : '#0E1628',
              borderColor: selectedParl === null ? '#2563EB' : '#1C2940',
              color: selectedParl === null ? '#fff' : '#7E8AA3',
            }}>All Parliaments</button>
          {parliaments.map(p => (
            <button key={p} onClick={() => setSelectedParl(p)}
              style={{ padding: '6px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', border: '1px solid', transition: 'all 0.15s',
                backgroundColor: selectedParl === p ? '#2563EB' : '#0E1628',
                borderColor: selectedParl === p ? '#2563EB' : '#1C2940',
                color: selectedParl === p ? '#fff' : '#7E8AA3',
              }}>
              {PARLIAMENT_LABELS[p] || `${p}th Parliament`}
            </button>
          ))}
        </div>
        {composition && (
          <p style={{ fontSize: '12px', color: '#4E5A73', margin: '10px 0 0' }}>{composition.dates}</p>
        )}
      </div>

      {loading ? (
        <div style={{ color: '#4E5A73', fontSize: '13px', padding: '20px 0' }}>Updating…</div>
      ) : (
        <>
          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <KpiCard value={`${totals.passed}/${totals.all}`} label="Made it into law" sub={`${passRate}% pass rate`} color="#2E8B57" />
            <KpiCard value={timing.median !== null ? `${timing.median}d` : '—'} label="Median time to pass" sub={timing.avg !== null ? `Average ${timing.avg} days` : 'Not enough data'} />
            <KpiCard value={totals.before} label={selectedParl && selectedParl < 48 ? 'Lapsed at dissolution' : 'Still before Parliament'} sub={selectedParl && selectedParl < 48 ? 'Introduced but not voted on before parliament dissolved' : 'Introduced but not yet voted on'} color="#7E8AA3" />
          </div>

          {/* Outcome + Origin */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div style={{ backgroundColor: '#0E1628', border: '1px solid #1C2940', borderRadius: '12px', padding: '24px' }}>
              <p style={{ fontSize: '10px', fontWeight: 600, color: '#3A4A6A', margin: '0 0 20px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>What happened to the bills</p>
              <DonutChart passed={totals.passed} notPassed={totals.notPassed} before={totals.before} total={totals.all || 1} selectedParl={selectedParl} />
            </div>
            <div style={{ backgroundColor: '#0E1628', border: '1px solid #1C2940', borderRadius: '12px', padding: '24px' }}>
              <p style={{ fontSize: '10px', fontWeight: 600, color: '#3A4A6A', margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Where bills started</p>
              {[
                { label: 'House of Representatives', count: origin.house, color: '#2563EB' },
                { label: 'Senate', count: origin.senate, color: '#7C3AED' },
              ].map(({ label, count, color }) => {
                const total = origin.house + origin.senate || 1;
                return (
                  <div key={label} style={{ marginBottom: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '12px', color: '#B6C0D1' }}>{label}</span>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#F5F7FB' }}>{count} <span style={{ color: '#4E5A73', fontWeight: 400 }}>({Math.round((count/total)*100)}%)</span></span>
                    </div>
                    <div style={{ height: '8px', backgroundColor: '#1C2940', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(count / total) * 100}%`, backgroundColor: color, borderRadius: '4px' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Parliament composition — only when a parliament is selected */}
          {composition && (
            <div style={{ backgroundColor: '#0E1628', border: '1px solid #1C2940', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
              <p style={{ fontSize: '10px', fontWeight: 600, color: '#3A4A6A', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                Parliament Composition
              </p>
              <p style={{ fontSize: '12px', color: '#4E5A73', margin: '0 0 24px', lineHeight: '1.5' }}>
                Seat distribution across both chambers during the {composition.label}. A party needs a majority to pass bills without crossbench support.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '28px' }}>
                <SeatsBar parties={composition.hor} total={horTotal} chamber="House of Representatives" />
                <SeatsBar parties={composition.senate} total={senTotal} chamber="Senate" />
              </div>
            </div>
          )}

          {/* Voice vs formal */}
          <div style={{ backgroundColor: '#0E1628', border: '1px solid #1C2940', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
            <p style={{ fontSize: '10px', fontWeight: 600, color: '#3A4A6A', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>How bills were decided</p>
            <p style={{ fontSize: '12px', color: '#4E5A73', margin: '0 0 16px', lineHeight: '1.5' }}>
              A recorded vote means each MP's position is counted individually. A voice vote means parliament agreed without anyone calling for a formal count — typical for uncontested bills.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ textAlign: 'center', padding: '16px', backgroundColor: '#0A1020', borderRadius: '8px', border: '1px solid #1C2940' }}>
                <div style={{ fontSize: '32px', fontWeight: 700, color: '#F5F7FB', lineHeight: 1 }}>{divisions.passedWithFormal}</div>
                <div style={{ fontSize: '12px', color: '#B6C0D1', marginTop: '6px' }}>Recorded vote</div>
                <div style={{ fontSize: '11px', color: '#4E5A73', marginTop: '3px' }}>Formal division called</div>
              </div>
              <div style={{ textAlign: 'center', padding: '16px', backgroundColor: '#0A1020', borderRadius: '8px', border: '1px solid #1C2940' }}>
                <div style={{ fontSize: '32px', fontWeight: 700, color: '#7E8AA3', lineHeight: 1 }}>{divisions.passedByVoice}</div>
                <div style={{ fontSize: '12px', color: '#B6C0D1', marginTop: '6px' }}>Voice vote</div>
                <div style={{ fontSize: '11px', color: '#4E5A73', marginTop: '3px' }}>No formal count taken</div>
              </div>
            </div>
          </div>

          {/* Record bills */}
          {(timing.fastest || timing.slowest) && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              {timing.fastest && <RecordCard label="Fastest bill" badge="⚡ Record" days={timing.fastest.days} title={timing.fastest.title} id={timing.fastest.id} color="#2E8B57" />}
              {timing.slowest && <RecordCard label="Slowest bill" badge="🐢 Marathon" days={timing.slowest.days} title={timing.slowest.title} id={timing.slowest.id} color="#D95C4B" />}
            </div>
          )}

          {/* Most contested */}
          {divisions.mostContested.length > 0 && (
            <div style={{ backgroundColor: '#0E1628', border: '1px solid #1C2940', borderRadius: '12px', padding: '24px' }}>
              <p style={{ fontSize: '10px', fontWeight: 600, color: '#3A4A6A', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Most contested bills</p>
              <p style={{ fontSize: '12px', color: '#4E5A73', margin: '0 0 12px', lineHeight: '1.5' }}>
                These bills had the most formal divisions — a sign they were genuinely fought over in the chamber.
              </p>
              {divisions.mostContested.map((b, i) => (
                <ContestCard key={b.id} rank={i + 1} count={b.count} title={b.title} id={b.id} />
              ))}
            </div>
          )}

          <p style={{ fontSize: '11px', color: '#3A4A6A', marginTop: '32px', lineHeight: '1.6' }}>
            Timing data is measured from introduction date to last recorded division. Bills that passed by voice vote may not have timing data.
            Division data sourced from They Vote For You. Seat composition based on official election results.
          </p>
        </>
      )}
    </div>
  );
}
