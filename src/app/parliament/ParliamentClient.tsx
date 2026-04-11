'use client';
import { useRef, useState, useCallback } from 'react';
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

const HOR_ORDER    = ['ALP','Liberal','LNP','Nationals','Greens','KAP','Independent','CA','One Nation','UAP'];
const SENATE_ORDER = ['ALP','Liberal','LNP','Nationals','Greens','One Nation','JLN','CLP','Independent','UAP','AU Voice','President'];

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

// Hemicycle: arc spans ~170° (almost full half-circle).
// Centre point sits BELOW the visible viewBox so we only see the upper half of the arcs.
// ViewBox: 0 0 1000 520  — centre at (500, 680)
// Innermost radius = 250, each row adds 50px, giving good separation.
function hemicycle(total: number, rows: number, dotDiam: number): { x: number; y: number }[] {
  const cx = 500;
  const cy = 680; // centre well below viewBox bottom (520) → clean semicircle
  const baseR = 255;
  const rowPad = dotDiam * 2.4; // row spacing scaled to dot size so no overlap
  const radii = Array.from({ length: rows }, (_, i) => baseR + i * rowPad);
  const rowCounts = distributeSeats(total, radii);
  const pts: { x: number; y: number }[] = [];
  for (let r = 0; r < rows; r++) {
    const R = radii[r];
    const n = rowCounts[r];
    for (let i = 0; i < n; i++) {
      // Span from ~8° to 172° of the semicircle
      const a = Math.PI * 0.055 + (i / Math.max(n - 1, 1)) * Math.PI * 0.89;
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
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced hide — gives cursor time to move from dot to tooltip without flickering
  const scheduleHide = useCallback(() => {
    hideTimer.current = setTimeout(() => setTip(null), 120);
  }, []);
  const cancelHide = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
  }, []);

  const members  = chamber === 'hor' ? data.hor : data.senate;
  const order    = chamber === 'hor' ? HOR_ORDER : SENATE_ORDER;
  const sorted   = sortMembers(members, order);
  // Dot size: HoR needs smaller dots (151 seats), Senate can be larger (76 seats)
  const dotR     = chamber === 'hor' ? 8 : 10;
  const rows     = chamber === 'hor' ? 8 : 5;
  const pos      = hemicycle(sorted.length, rows, dotR);

  const counts: Record<string, number> = {};
  for (const m of members) counts[m.party] = (counts[m.party] || 0) + 1;
  const partyList = [...new Set([...order, ...Object.keys(counts)])].filter(p => counts[p]);

  const majority = chamber === 'hor' ? 76 : 39;
  const alpSeats = counts['ALP'] || 0;
  const coalition = (counts['Liberal'] || 0) + (counts['LNP'] || 0) + (counts['Nationals'] || 0);
  const cross = sorted.length - alpSeats - coalition;

  // SVG viewBox: 1000 wide, 520 tall. Centre at (500, 680) so arcs emerge from the bottom.
  // Floor line sits near y=490 (visible area).
  const VB = '0 0 1000 520';
  const floorY = 490;
  const labelY = floorY - 8;

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
      <div
        style={{ background: '#0A1220', border: '1px solid #1C2940', borderRadius: '16px', overflow: 'visible', position: 'relative', marginTop: '24px' }}
        onMouseLeave={scheduleHide}
        onMouseEnter={cancelHide}
      >
        <svg
          ref={svgRef}
          viewBox={VB}
          style={{ width: '100%', display: 'block', userSelect: 'none', borderRadius: '16px', overflow: 'hidden' }}
        >
          {/* Background */}
          <rect x="0" y="0" width="1000" height="520" fill="#0A1220" />

          {/* Floor line */}
          <line x1="40" y1={floorY} x2="960" y2={floorY} stroke="#1C2940" strokeWidth="1.5" />

          {/* OPPOSITION / CROSS / GOVERNMENT labels */}
          <text x="55" y={labelY} fontSize="10" fill="#4E5A73" fontWeight="700" letterSpacing="1.5">OPPOSITION</text>
          <text x="465" y={labelY} fontSize="10" fill="#4E5A73" fontWeight="700" letterSpacing="1.5">CROSS</text>
          <text x="800" y={labelY} fontSize="10" fill="#4E5A73" fontWeight="700" letterSpacing="1.5">GOVERNMENT</text>

          {/* Dispatch boxes */}
          <rect x="455" y={floorY + 8} width="36" height="16" rx="3" fill="#111A2E" stroke="#1C2940" strokeWidth="1" />
          <rect x="509" y={floorY + 8} width="36" height="16" rx="3" fill="#111A2E" stroke="#1C2940" strokeWidth="1" />

          {/* Speaker/President chair */}
          <circle cx="500" cy={floorY + 34} r="16" fill="#1C2940" stroke="#25324D" strokeWidth="1.5" />
          <text x="500" y={floorY + 38} textAnchor="middle" fontSize="8.5" fill="#7E8AA3" fontWeight="700" letterSpacing="0.5">
            {chamber === 'hor' ? 'SPEAKER' : 'PRES'}
          </text>

          {/* Seats */}
          {sorted.map((m, i) => {
            const p = pos[i];
            if (!p) return null;
            const c = color(m.party);
            const dimmed = hoverParty !== null && hoverParty !== m.party;
            return (
              <circle
                key={m.id}
                cx={p.x} cy={p.y} r={dotR}
                fill={c}
                opacity={dimmed ? 0.15 : 1}
                stroke={hoverParty === m.party ? '#ffffff' : '#0A1220'}
                strokeWidth={hoverParty === m.party ? 1.5 : 0.8}
                style={{ cursor: 'pointer', transition: 'opacity 0.12s' }}
                onMouseEnter={(e) => {
                  cancelHide();
                  const rect = svgRef.current?.getBoundingClientRect();
                  if (!rect) return;
                  setTip({ member: m, x: e.clientX - rect.left, y: e.clientY - rect.top });
                }}
                onMouseLeave={scheduleHide}
              />
            );
          })}
        </svg>

        {/* Tooltip — pointerEvents none so it never intercepts mouse */}
        {tip && (
          <div
            onMouseEnter={cancelHide}
            onMouseLeave={scheduleHide}
            style={{
              position: 'absolute',
              left: Math.min(tip.x + 18, (svgRef.current?.clientWidth || 700) - 220),
              top: Math.max(tip.y - 90, 8),
              background: '#0D1526',
              border: '1px solid #25324D',
              borderRadius: '12px',
              padding: '12px 14px',
              zIndex: 50,
              minWidth: '180px',
              boxShadow: '0 12px 32px rgba(0,0,0,0.65)',
              pointerEvents: 'auto',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              {tip.member.photo ? (
                <img
                  src={tip.member.photo}
                  alt=""
                  style={{
                    width: '46px', height: '46px', borderRadius: '50%', objectFit: 'cover',
                    border: `2px solid ${color(tip.member.party)}`, flexShrink: 0,
                  }}
                />
              ) : (
                <div style={{
                  width: '46px', height: '46px', borderRadius: '50%', flexShrink: 0,
                  background: color(tip.member.party) + '33',
                  border: `2px solid ${color(tip.member.party)}55`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '18px',
                }}>👤</div>
              )}
              <div>
                <div style={{ fontWeight: 600, fontSize: '13px', color: '#F5F7FB', lineHeight: 1.3 }}>{tip.member.name}</div>
                <div style={{ fontSize: '11px', color: '#7E8AA3', marginTop: '3px' }}>
                  {chamber === 'hor' ? `Electorate of ${tip.member.electorate}` : `Senator for ${tip.member.state}`}
                </div>
              </div>
            </div>
            <div style={{
              display: 'inline-block',
              background: color(tip.member.party) + '20',
              border: `1px solid ${color(tip.member.party)}50`,
              borderRadius: '5px', padding: '3px 9px',
              fontSize: '11px', color: color(tip.member.party), fontWeight: 600,
            }}>
              {tip.member.party}
            </div>
            <div style={{ marginTop: '8px', borderTop: '1px solid #1C2940', paddingTop: '8px' }}>
              <Link
                href={`/electorates/${tip.member.id}`}
                style={{ fontSize: '12px', color: '#4E8FD4', textDecoration: 'none', fontWeight: 500 }}
              >
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
                style={{
                  width: `${(counts[p] / sorted.length) * 100}%`,
                  background: color(p),
                  opacity: hoverParty && hoverParty !== p ? 0.25 : 1,
                  transition: 'opacity 0.15s',
                }} />
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
