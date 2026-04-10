'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface StatsData {
  totals: { all: number; passed: number; notPassed: number; before: number };
  passRate: number;
  timing: {
    avg: number | null;
    median: number | null;
    fastest: { days: number; title: string; id: string } | null;
    slowest: { days: number; title: string; id: string } | null;
    count: number;
  };
  divisions: {
    passedWithFormal: number;
    passedByVoice: number;
    mostContested: Array<{ count: number; title: string; id: string }>;
  };
  origin: { house: number; senate: number; unknown: number };
}

function KpiCard({ value, label, sub, color }: { value: string | number; label: string; sub?: string; color?: string }) {
  return (
    <div style={{
      backgroundColor: '#0E1628', border: '1px solid #1C2940', borderRadius: '12px',
      padding: '24px', display: 'flex', flexDirection: 'column', gap: '6px',
    }}>
      <div style={{ fontSize: '40px', fontWeight: 700, color: color || '#F5F7FB', lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: '13px', fontWeight: 600, color: '#B6C0D1' }}>{label}</div>
      {sub && <div style={{ fontSize: '11px', color: '#4E5A73', lineHeight: '1.4' }}>{sub}</div>}
    </div>
  );
}

function DonutChart({ passed, notPassed, before, total }: { passed: number; notPassed: number; before: number; total: number }) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const passedPct = passed / total;
  const notPassedPct = notPassed / total;
  const beforePct = before / total;

  const passedDash = passedPct * circ;
  const notPassedDash = notPassedPct * circ;
  const beforeDash = beforePct * circ;

  const passedOffset = 0;
  const notPassedOffset = -passedDash;
  const beforeOffset = -(passedDash + notPassedDash);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
      <svg width={130} height={130} viewBox="0 0 130 130" style={{ flexShrink: 0 }}>
        <circle cx={65} cy={65} r={r} fill="none" stroke="#1C2940" strokeWidth={14} />
        {/* Passed */}
        <circle cx={65} cy={65} r={r} fill="none" stroke="#2E8B57" strokeWidth={14}
          strokeDasharray={`${passedDash} ${circ - passedDash}`}
          strokeDashoffset={circ / 4 + passedOffset}
          style={{ transform: 'rotate(-90deg)', transformOrigin: '65px 65px' }} />
        {/* Not Passed */}
        <circle cx={65} cy={65} r={r} fill="none" stroke="#D95C4B" strokeWidth={14}
          strokeDasharray={`${notPassedDash} ${circ - notPassedDash}`}
          strokeDashoffset={circ / 4 - passedDash}
          style={{ transform: 'rotate(-90deg)', transformOrigin: '65px 65px' }} />
        {/* Before Parliament */}
        <circle cx={65} cy={65} r={r} fill="none" stroke="#3A4A6A" strokeWidth={14}
          strokeDasharray={`${beforeDash} ${circ - beforeDash}`}
          strokeDashoffset={circ / 4 - (passedDash + notPassedDash)}
          style={{ transform: 'rotate(-90deg)', transformOrigin: '65px 65px' }} />
        <text x={65} y={61} textAnchor="middle" fill="#F5F7FB" fontSize={20} fontWeight={700}>{Math.round(passedPct * 100)}%</text>
        <text x={65} y={77} textAnchor="middle" fill="#7E8AA3" fontSize={10}>passed</text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {[
          { label: 'Became law', count: passed, color: '#2E8B57' },
          { label: 'Before Parliament', count: before, color: '#3A4A6A' },
          { label: "Didn't pass", count: notPassed, color: '#D95C4B' },
        ].map(({ label, count, color }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: color, flexShrink: 0 }} />
            <span style={{ fontSize: '12px', color: '#B6C0D1' }}>{label}</span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#F5F7FB', marginLeft: 'auto' }}>{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function OriginBar({ house, senate, total }: { house: number; senate: number; total: number }) {
  const housePct = Math.round((house / total) * 100);
  const senatePct = Math.round((senate / total) * 100);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {[
        { label: 'House of Representatives', count: house, pct: housePct, color: '#2563EB' },
        { label: 'Senate', count: senate, pct: senatePct, color: '#7C3AED' },
      ].map(({ label, count, pct, color }) => (
        <div key={label}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '12px', color: '#B6C0D1' }}>{label}</span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#F5F7FB' }}>{count} <span style={{ color: '#4E5A73', fontWeight: 400 }}>({pct}%)</span></span>
          </div>
          <div style={{ height: '8px', backgroundColor: '#1C2940', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, backgroundColor: color, borderRadius: '4px', transition: 'width 0.6s ease' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function RecordCard({ label, badge, days, title, id, color }: {
  label: string; badge: string; days: number; title: string; id: string; color: string;
}) {
  const titleClean = title.replace(/Bill\s+\d{4}(-\d{4})?(\s+\(No\.\s*\d+\))?$/i, '').trim();
  return (
    <Link href={`/bills/${id}`} style={{ textDecoration: 'none' }}>
      <div style={{
        backgroundColor: '#0E1628', border: `1px solid ${color}33`,
        borderRadius: '12px', padding: '20px', cursor: 'pointer',
        transition: 'border-color 0.2s',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <span style={{ fontSize: '10px', fontWeight: 600, color: '#4E5A73', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</span>
          <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', backgroundColor: `${color}22`, color, border: `1px solid ${color}44` }}>{badge}</span>
        </div>
        <div style={{ fontSize: '36px', fontWeight: 700, color, lineHeight: 1, marginBottom: '4px' }}>
          {days} <span style={{ fontSize: '16px', fontWeight: 400, color: '#7E8AA3' }}>days</span>
        </div>
        {/* Mini timeline */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '12px 0' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: color }} />
          <div style={{ flex: 1, height: 2, backgroundColor: '#1C2940', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: '100%', backgroundColor: color, opacity: 0.4 }} />
          </div>
          <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: color }} />
        </div>
        <div style={{ fontSize: '12px', color: '#7E8AA3', lineHeight: '1.4' }}>{titleClean}</div>
      </div>
    </Link>
  );
}

function ContestCard({ rank, count, title, id }: { rank: number; count: number; title: string; id: string }) {
  const titleClean = title.replace(/Bill\s+\d{4}(-\d{4})?(\s+\(No\.\s*\d+\))?$/i, '').trim()
    .replace(/&rsquo;/g, "'").replace(/&amp;/g, '&');
  return (
    <Link href={`/bills/${id}`} style={{ textDecoration: 'none' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '14px',
        padding: '12px 0', borderBottom: '1px solid #1C2940',
      }}>
        <div style={{ fontSize: '18px', fontWeight: 700, color: '#3A4A6A', width: '24px', flexShrink: 0 }}>#{rank}</div>
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

  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#4E5A73', fontSize: '14px' }}>Loading stats…</div>
    </div>
  );

  if (!data) return null;

  const { totals, passRate, timing, divisions, origin } = data;

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 20px 80px' }}>
      {/* Header */}
      <div style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#F5F7FB', margin: '0 0 8px' }}>
          By the Numbers
        </h1>
        <p style={{ fontSize: '14px', color: '#7E8AA3', margin: 0, lineHeight: '1.6' }}>
          A quick look at how bills travel through Parliament, and how many make it to the finish line.
          Based on {totals.all} bills tracked on Crossbench.
        </p>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <KpiCard
          value={`${totals.passed} of ${totals.all}`}
          label="Made it into law"
          sub={`${passRate}% pass rate in this parliamentary term`}
          color="#2E8B57"
        />
        <KpiCard
          value={timing.median !== null ? `${timing.median}d` : '—'}
          label="Median time to pass"
          sub={timing.avg !== null ? `Average ${timing.avg} days from introduction to passage` : undefined}
        />
        <KpiCard
          value={totals.before}
          label="Still before Parliament"
          sub="Bills introduced but not yet voted on"
          color="#7E8AA3"
        />
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {/* Outcome donut */}
        <div style={{ backgroundColor: '#0E1628', border: '1px solid #1C2940', borderRadius: '12px', padding: '24px' }}>
          <p style={{ fontSize: '10px', fontWeight: 600, color: '#3A4A6A', margin: '0 0 20px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            What happened to the bills
          </p>
          <DonutChart passed={totals.passed} notPassed={totals.notPassed} before={totals.before} total={totals.all} />
        </div>

        {/* Origin bar */}
        <div style={{ backgroundColor: '#0E1628', border: '1px solid #1C2940', borderRadius: '12px', padding: '24px' }}>
          <p style={{ fontSize: '10px', fontWeight: 600, color: '#3A4A6A', margin: '0 0 20px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Where bills started
          </p>
          <OriginBar house={origin.house} senate={origin.senate} total={origin.house + origin.senate || 1} />
          <p style={{ fontSize: '11px', color: '#4E5A73', margin: '16px 0 0', lineHeight: '1.5' }}>
            Bills can start in either the House or Senate, then pass through both chambers before becoming law.
          </p>
        </div>
      </div>

      {/* Voice vs formal division */}
      <div style={{ backgroundColor: '#0E1628', border: '1px solid #1C2940', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
        <p style={{ fontSize: '10px', fontWeight: 600, color: '#3A4A6A', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          How bills were decided
        </p>
        <p style={{ fontSize: '12px', color: '#4E5A73', margin: '0 0 20px', lineHeight: '1.5' }}>
          A formal division means votes were recorded individually. A voice vote means parliament agreed without anyone calling for a count — usually for uncontested bills.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ textAlign: 'center', padding: '16px', backgroundColor: '#0A1020', borderRadius: '8px', border: '1px solid #1C2940' }}>
            <div style={{ fontSize: '32px', fontWeight: 700, color: '#F5F7FB', lineHeight: 1 }}>{divisions.passedWithFormal}</div>
            <div style={{ fontSize: '12px', color: '#B6C0D1', marginTop: '6px' }}>Passed with a recorded vote</div>
            <div style={{ fontSize: '11px', color: '#4E5A73', marginTop: '3px' }}>Formal division called</div>
          </div>
          <div style={{ textAlign: 'center', padding: '16px', backgroundColor: '#0A1020', borderRadius: '8px', border: '1px solid #1C2940' }}>
            <div style={{ fontSize: '32px', fontWeight: 700, color: '#7E8AA3', lineHeight: 1 }}>{divisions.passedByVoice}</div>
            <div style={{ fontSize: '12px', color: '#B6C0D1', marginTop: '6px' }}>Passed without a count</div>
            <div style={{ fontSize: '11px', color: '#4E5A73', marginTop: '3px' }}>Voice vote only</div>
          </div>
        </div>
      </div>

      {/* Record bills */}
      {(timing.fastest || timing.slowest) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          {timing.fastest && (
            <RecordCard
              label="Fastest bill"
              badge="⚡ Record"
              days={timing.fastest.days}
              title={timing.fastest.title}
              id={timing.fastest.id}
              color="#2E8B57"
            />
          )}
          {timing.slowest && (
            <RecordCard
              label="Slowest bill"
              badge="🐢 Marathon"
              days={timing.slowest.days}
              title={timing.slowest.title}
              id={timing.slowest.id}
              color="#D95C4B"
            />
          )}
        </div>
      )}

      {/* Most contested */}
      {divisions.mostContested.length > 0 && (
        <div style={{ backgroundColor: '#0E1628', border: '1px solid #1C2940', borderRadius: '12px', padding: '24px' }}>
          <p style={{ fontSize: '10px', fontWeight: 600, color: '#3A4A6A', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Most contested bills
          </p>
          <p style={{ fontSize: '12px', color: '#4E5A73', margin: '0 0 16px', lineHeight: '1.5' }}>
            These bills had the most formal divisions — a sign they were genuinely fought over in the chamber.
          </p>
          {divisions.mostContested.map((b, i) => (
            <ContestCard key={b.id} rank={i + 1} count={b.count} title={b.title} id={b.id} />
          ))}
        </div>
      )}

      {/* Footer note */}
      <p style={{ fontSize: '11px', color: '#3A4A6A', marginTop: '32px', lineHeight: '1.6' }}>
        Timing data is based on introduction date to last recorded division. Bills that passed by voice vote may have shorter apparent timelines.
        Division data sourced from They Vote For You.
      </p>
    </div>
  );
}
