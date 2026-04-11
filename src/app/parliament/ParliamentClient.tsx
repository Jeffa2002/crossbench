'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';

interface Member {
  id: string;
  name: string | null;
  electorate: string;
  state: string | null;
  party: string;
  rawParty: string | null;
  photo: string | null;
}

export interface ParliamentData {
  hor: Member[];
  senate: Member[];
}

const PARTY_COLORS: Record<string, string> = {
  'ALP':         '#CC2222',
  'Liberal':     '#1565C0',
  'LNP':         '#1976D2',
  'Nationals':   '#2E7D32',
  'Greens':      '#43A047',
  'One Nation':  '#E65100',
  'KAP':         '#6D4C41',
  'Independent': '#78909C',
  'JLN':         '#7B1FA2',
  'UAP':         '#F9A825',
  'CLP':         '#0288D1',
  'CA':          '#00897B',
  'AU Voice':    '#C0392B',
  'President':   '#546E7A',
};

const HOR_ORDER   = ['ALP','Liberal','LNP','Nationals','Greens','KAP','Independent','CA','One Nation','UAP'];
const SENATE_ORDER= ['ALP','Liberal','LNP','Nationals','Greens','One Nation','JLN','CLP','Independent','UAP','AU Voice','President'];

function color(party: string) { return PARTY_COLORS[party] || '#4E5A73'; }

function distributeSeats(total: number, radii: number[]): number[] {
  const perims = radii.map(r => Math.PI * r);
  const sum = perims.reduce((a, b) => a + b, 0);
  const counts = perims.map(p => Math.round((p / sum) * total));
  let diff = total - counts.reduce((a, b) => a + b, 0);
  let i = counts.length - 1;
  while (diff > 0) { counts[i % counts.length]++; diff--; i--; }
  while (diff < 0) { counts[i % counts.length] = Math.max(0, counts[i % counts.length] - 1); diff++; i--; }
  return counts;
}

function hemicycle(total: number, rows: number) {
  const cx = 500, cy = 590;
  const baseR = 185, pad = 42;
  const radii = Array.from({ length: rows }, (_, i) => baseR + i * pad);
  const rowCounts = distributeSeats(total, radii);
  const pts: { x: number; y: number }[] = [];
  for (let r = 0; r < rows; r++) {
    const R = radii[r];
    const n = rowCounts[r];
    for (let i = 0; i < n; i++) {
      const a = Math.PI * 0.07 + (i / Math.max(n - 1, 1)) * Math.PI * 0.86;
      pts.push({ x: cx - R * Math.cos(a), y: cy - R * Math.sin(a) });
    }
  }
  return pts;
}

function sortMembers(members: Member[], order: string[]) {
  const grouped: Record<string, Member[]> = {};
  for (const m of members) { (grouped[m.party] = grouped[m.party] || []).push(m); }
  const result: Member[] = [];
  for (const p of order) if (grouped[p]) result.push(...grouped[p]);
  for (const [p, ms] of Object.entries(grouped)) if (!order.includes(p)) result.push(...ms);
  return result;
}

interface Tip { member: Member; x: number; y: number }

export default function ParliamentClient({ data }: { data: ParliamentData }) {
  const [chamber, setChamber] = useState<'hor' | 'senate'>('hor');
  const [tip, setTip] = useState<Tip | null>(null);
  const [hoverParty, setHoverParty] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const members = chamber === 'hor' ? data.hor : data.senate;
  const order   = chamber === 'hor' ? HOR_ORDER : SENATE_ORDER;
  const sorted  = sortMembers(members, order);
  const rows    = chamber === 'hor' ? 8 : 5;
  const pos     = hemicycle(sorted.length, rows);
  const dotR    = chamber === 'hor' ? 7.5 : 9.5;

  const counts: Record<string, number> = {};
  for (const m of members) counts[m.party] = (counts[m.party] || 0) + 1;
  const partyList = [...new Set([...order, ...Object.keys(counts)])].filter(p => counts[p]);

  const majority = chamber === 'hor' ? 76 : 39;
  const alpSeats = counts['ALP'] || 0;
  const coalition = (counts['Liberal'] || 0) + (counts['LNP'] || 0) + (counts['Nationals'] || 0);
  const cross = sorted.length - alpSeats - coalition;

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 20px 60px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, margin: 0, letterSpacing: '-0.5px', color: '#F5F7FB' }}>
            🏛️ Parliament
          </h1>
          <p style={{ color: '#7E8AA3', fontSize: '14px', marginTop: '6px' }}>
            Interactive seating chart · 48th Parliament of Australia
          </p>
        </div>
        <div style={{ display: 'flex', background: '#0E1628', border: '1px solid #1C2940', borderRadius: '10px', overflow: 'hidden' }}>
          {(['hor', 'senate'] as const).map(c => (
            <button key={c} onClick={() => { setChamber(c); setTip(null); }}
              style={{
                padding: '10px 20px', border: 'none',
                background: chamber === c ? '#1C2940' : 'transparent',
                color: chamber === c ? '#F5F7FB' : '#7E8AA3',
                fontWeight: chamber === c ? 600 : 400,
                fontSize: '14px', cursor: 'pointer',
              }}>
              {c === 'hor' ? '🟢 House of Reps' : '🔵 Senate'}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'flex', gap: '12px', marginTop: '24px', flexWrap: 'wrap' }}>
        <Pill label="Total seats" value={sorted.length} />
        <Pill label="ALP" value={alpSeats} c="#CC2222" />
        <Pill label="Coalition" value={coalition} c="#1565C0" />
        <Pill label="Crossbench" value={cross} c="#78909C" />
        <Pill label={`Majority (${majority}+)`} value={alpSeats >= majority ? '✓ Majority' : '✗ No majority'} c={alpSeats >= majority ? '#43A047' : '#E53935'} />
      </div>

      {/* Hemicycle */}
      <div style={{ background: '#0A1220', border: '1px solid #1C2940', borderRadius: '16px', overflow: 'hidden', position: 'relative', marginTop: '24px' }}>
        <svg ref={svgRef} viewBox="100 50 800 560" style={{ width: '100%', display: 'block', userSelect: 'none' }}
          onMouseLeave={() => setTip(null)}>
          {/* Floor line */}
          <line x1="130" y1="545" x2="870" y2="545" stroke="#1C2940" strokeWidth="1" />
          {/* Labels */}
          <text x="148" y="540" fontSize="9" fill="#4E5A73" fontWeight="600" letterSpacing="1">OPPOSITION</text>
          <text x="726" y="540" fontSize="9" fill="#4E5A73" fontWeight="600" letterSpacing="1">GOVERNMENT</text>
          <text x="472" y="540" fontSize="9" fill="#4E5A73" fontWeight="600" letterSpacing="1">CROSS</text>
          {/* Dispatch boxes */}
          <rect x="455" y="552" width="32" height="14" rx="3" fill="#111A2E" stroke="#1C2940" />
          <rect x="513" y="552" width="32" height="14" rx="3" fill="#111A2E" stroke="#1C2940" />
          {/* Speaker / President chair */}
          <circle cx="500" cy="573" r="13" fill="#1C2940" stroke="#25324D" strokeWidth="1.5" />
          <text x="500" y="577" textAnchor="middle" fontSize="8" fill="#7E8AA3" fontWeight="600">
            {chamber === 'hor' ? 'SPEAKER' : 'PRES'}
          </text>

          {/* Seats */}
          {sorted.map((m, i) => {
            const p = pos[i];
            if (!p) return null;
            const c = color(m.party);
            const dimmed = hoverParty !== null && hoverParty !== m.party;
            return (
              <circle key={m.id} cx={p.x} cy={p.y} r={dotR} fill={c}
                opacity={dimmed ? 0.18 : 1}
                stroke={hoverParty === m.party ? '#fff' : 'none'}
                strokeWidth={hoverParty === m.party ? 1.5 : 0}
                style={{ cursor: 'pointer', transition: 'opacity 0.12s' }}
                onMouseEnter={(e) => {
                  const rect = svgRef.current?.getBoundingClientRect();
                  if (!rect) return;
                  setTip({ member: m, x: e.clientX - rect.left, y: e.clientY - rect.top });
                }}
                onMouseLeave={() => setTip(null)}
              />
            );
          })}
        </svg>

        {/* Tooltip */}
        {tip && (
          <div style={{
            position: 'absolute',
            left: Math.min(tip.x + 16, (svgRef.current?.clientWidth || 600) - 210),
            top: Math.max(tip.y - 80, 8),
            background: '#0E1628', border: '1px solid #25324D', borderRadius: '10px',
            padding: '12px 14px', pointerEvents: 'none', zIndex: 50,
            minWidth: '170px', boxShadow: '0 8px 24px rgba(0,0,0,0.55)',
          }}>
            {tip.member.photo && (
              <img src={tip.member.photo} alt=""
                style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover',
                  marginBottom: '8px', border: `2px solid ${color(tip.member.party)}` }} />
            )}
            <div style={{ fontWeight: 600, fontSize: '13px', color: '#F5F7FB' }}>{tip.member.name}</div>
            <div style={{ fontSize: '12px', color: '#7E8AA3', marginTop: '2px' }}>
              {chamber === 'hor' ? `Electorate of ${tip.member.electorate}` : `Senator for ${tip.member.state}`}
            </div>
            <div style={{
              display: 'inline-block', marginTop: '6px',
              background: color(tip.member.party) + '22',
              border: `1px solid ${color(tip.member.party)}55`,
              borderRadius: '4px', padding: '2px 8px',
              fontSize: '11px', color: color(tip.member.party), fontWeight: 600,
            }}>
              {tip.member.party}
            </div>
            <div style={{ marginTop: '8px' }}>
              <Link href={`/electorates/${tip.member.id}`}
                style={{ fontSize: '11px', color: '#4E8FD4', textDecoration: 'none' }}>
                View profile →
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Legend + bar */}
      <div style={{ background: '#0E1628', border: '1px solid #1C2940', borderRadius: '12px', padding: '20px', marginTop: '20px' }}>
        <p style={{ fontSize: '12px', color: '#4E5A73', margin: '0 0 14px', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
          Party composition — {chamber === 'hor' ? 'House of Representatives' : 'Senate'}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {partyList.map(p => (
            <button key={p}
              onMouseEnter={() => setHoverParty(p)} onMouseLeave={() => setHoverParty(null)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                background: 'transparent', cursor: 'pointer',
                border: `1px solid ${hoverParty === p ? color(p) : '#1C2940'}`,
                borderRadius: '8px', padding: '7px 12px', transition: 'border-color 0.15s',
              }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: color(p), flexShrink: 0 }} />
              <span style={{ fontSize: '13px', color: '#B6C0D1', fontWeight: 500 }}>{p}</span>
              <span style={{ fontSize: '13px', color: color(p), fontWeight: 700 }}>{counts[p]}</span>
            </button>
          ))}
        </div>

        {/* Seat bar */}
        <div style={{ marginTop: '20px' }}>
          <p style={{ fontSize: '12px', color: '#4E5A73', margin: '0 0 8px', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
            Seat distribution
          </p>
          <div style={{ height: '24px', borderRadius: '6px', overflow: 'hidden', display: 'flex', background: '#111A2E' }}>
            {partyList.map(p => (
              <div key={p} title={`${p}: ${counts[p]} seats`}
                style={{ width: `${(counts[p] / sorted.length) * 100}%`, background: color(p), opacity: hoverParty && hoverParty !== p ? 0.25 : 1, transition: 'opacity 0.15s' }} />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
            <span style={{ fontSize: '11px', color: '#4E5A73' }}>0</span>
            <span style={{ fontSize: '11px', color: '#4E5A73' }}>Majority: {majority}</span>
            <span style={{ fontSize: '11px', color: '#4E5A73' }}>{sorted.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Pill({ label, value, c }: { label: string; value: string | number; c?: string }) {
  return (
    <div style={{ background: '#0E1628', border: '1px solid #1C2940', borderRadius: '8px', padding: '8px 14px' }}>
      <div style={{ fontSize: '11px', color: '#4E5A73', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</div>
      <div style={{ fontSize: '18px', fontWeight: 700, color: c || '#F5F7FB', lineHeight: 1, marginTop: '2px' }}>{value}</div>
    </div>
  );
}
