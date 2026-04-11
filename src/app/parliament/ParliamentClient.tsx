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
  'ALP':         '#E53935',
  'Liberal':     '#1E88E5',
  'LNP':         '#1976D2',
  'Nationals':   '#43A047',
  'Greens':      '#00C853',
  'One Nation':  '#FF6D00',
  'KAP':         '#795548',
  'Independent': '#90A4AE',
  'JLN':         '#AB47BC',
  'UAP':         '#FDD835',
  'CLP':         '#29B6F6',
  'CA':          '#26A69A',
  'AU Voice':    '#EF5350',
  'President':   '#546E7A',
};

const HOR_ORDER    = ['Liberal','LNP','Nationals','One Nation','KAP','CA','Independent','Greens','ALP','UAP'];
const SENATE_ORDER = ['Liberal','LNP','Nationals','One Nation','UAP','JLN','CLP','Independent','AU Voice','President','Greens','ALP'];

function color(party: string) { return PARTY_COLORS[party] || '#4E5A73'; }

function distributeSeats(total: number, radii: number[]): number[] {
  const perims = radii.map(r => Math.PI * r);
  const sum = perims.reduce((a, b) => a + b, 0);
  const counts = perims.map(p => Math.round((p / sum) * total));
  let diff = total - counts.reduce((a, b) => a + b, 0);
  let idx = counts.length - 1;
  while (diff > 0) { counts[idx-- % counts.length]++; diff--; }
  while (diff < 0) { const v = counts[idx-- % counts.length]; counts[(idx+1) % counts.length] = Math.max(1, v - 1); diff++; }
  return counts;
}

/**
 * Hemicycle geometry
 * ViewBox: 0 0 1000 460
 * Arc centre: (500, 460) — exactly at the bottom edge of viewBox
 * Innermost radius: 180   Outermost (8 rows): 180 + 7*34 = 418
 * All arcs span 170° (5° margin each side)
 * Since cy=460 = viewBox bottom, arcs are always ABOVE the floor → no overflow
 */
function hemicycle(total: number, rows: number): { x: number; y: number }[] {
  const cx  = 500;
  const cy  = 460; // at the bottom edge — arcs only go upward
  const r0  = 175; // innermost radius
  const dr  = 34;  // gap between rows
  const a0  = Math.PI * (1 - 0.94); // ~10.8° from left edge
  const a1  = Math.PI * 0.94;       // sweep ends ~10.8° from right edge
  const span = a1 - a0;

  const radii = Array.from({ length: rows }, (_, i) => r0 + i * dr);
  const rowCounts = distributeSeats(total, radii);
  const pts: { x: number; y: number }[] = [];

  for (let r = 0; r < rows; r++) {
    const R = radii[r];
    const n = rowCounts[r];
    for (let i = 0; i < n; i++) {
      // left→right: angle goes from π (left) down to 0 (right) — but we use a0..a1 in [0,π]
      // We place seats left-to-right: first seat at left (angle=π-a0), last at right (angle=a0)
      const t  = n > 1 ? i / (n - 1) : 0.5;
      const a  = Math.PI - a0 - t * span; // decreasing angle → left to right in SVG
      pts.push({
        x: cx + R * Math.cos(a),
        y: cy - R * Math.sin(a),
      });
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
  const [tip, setTip]           = useState<Tip | null>(null);
  const [hoverParty, setHoverParty] = useState<string | null>(null);
  const svgRef   = useRef<SVGSVGElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleHide = useCallback(() => {
    hideTimer.current = setTimeout(() => setTip(null), 150);
  }, []);
  const cancelHide = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
  }, []);

  const members = chamber === 'hor' ? data.hor : data.senate;
  const order   = chamber === 'hor' ? HOR_ORDER : SENATE_ORDER;
  const sorted  = sortMembers(members, order);
  const rows    = chamber === 'hor' ? 9 : 6;
  const dotR    = chamber === 'hor' ? 7 : 9;
  const pos     = hemicycle(sorted.length, rows);

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
        <Pill label="ALP" value={alpSeats} c="#E53935" />
        <Pill label="Coalition" value={coalition} c="#1E88E5" />
        <Pill label="Crossbench" value={cross} c="#90A4AE" />
        <Pill label={`Majority (${majority}+)`} value={alpSeats >= majority ? '✓ Majority' : '✗ No majority'} c={alpSeats >= majority ? '#43A047' : '#E53935'} />
      </div>

      {/* Hemicycle container */}
      <div
        style={{ background: '#0A1220', border: '1px solid #1C2940', borderRadius: '16px', position: 'relative', marginTop: '24px' }}
        onMouseLeave={scheduleHide}
        onMouseEnter={cancelHide}
      >
        <svg
          ref={svgRef}
          viewBox="0 0 1000 480"
          style={{ width: '100%', display: 'block', userSelect: 'none', borderRadius: '16px' }}
        >
          <rect width="1000" height="480" fill="#0A1220" />

          {/* Subtle arc guide lines */}
          {Array.from({ length: rows }).map((_, r) => {
            const R = 175 + r * 34;
            const a0 = Math.PI * 0.06;
            const x1 = 500 + R * Math.cos(Math.PI - a0);
            const y1 = 460 - R * Math.sin(Math.PI - a0);
            const x2 = 500 + R * Math.cos(a0);
            const y2 = 460 - R * Math.sin(a0);
            return (
              <path
                key={r}
                d={`M ${x1} ${y1} A ${R} ${R} 0 0 1 ${x2} ${y2}`}
                fill="none" stroke="#1C2940" strokeWidth="0.5" opacity="0.5"
              />
            );
          })}

          {/* Floor line */}
          <line x1="30" y1="462" x2="970" y2="462" stroke="#25324D" strokeWidth="1.5" />

          {/* Left/centre/right labels */}
          <text x="38"  y="456" fontSize="9" fill="#4E5A73" fontWeight="700" letterSpacing="1.5">OPPOSITION</text>
          <text x="462" y="456" fontSize="9" fill="#4E5A73" fontWeight="700" letterSpacing="1.5">CROSS</text>
          <text x="820" y="456" fontSize="9" fill="#4E5A73" fontWeight="700" letterSpacing="1.5">GOVERNMENT</text>

          {/* Dispatch boxes */}
          <rect x="454" y="463" width="36" height="14" rx="2" fill="#111A2E" stroke="#1C2940" />
          <rect x="510" y="463" width="36" height="14" rx="2" fill="#111A2E" stroke="#1C2940" />

          {/* Speaker/President chair */}
          <ellipse cx="500" cy="479" rx="22" ry="10" fill="#111A2E" stroke="#25324D" strokeWidth="1.2" />
          <text x="500" y="483" textAnchor="middle" fontSize="7.5" fill="#7E8AA3" fontWeight="700" letterSpacing="0.5">
            {chamber === 'hor' ? 'SPEAKER' : 'PRES'}
          </text>

          {/* Seats */}
          {sorted.map((m, i) => {
            const p = pos[i];
            if (!p) return null;
            const c  = color(m.party);
            const dim = hoverParty !== null && hoverParty !== m.party;
            return (
              <circle
                key={m.id}
                cx={p.x} cy={p.y} r={dotR}
                fill={c}
                opacity={dim ? 0.12 : 0.92}
                stroke="#0A1220"
                strokeWidth="1"
                style={{ cursor: 'pointer', transition: 'opacity 0.1s' }}
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

        {/* Tooltip */}
        {tip && (() => {
          const svgW = svgRef.current?.clientWidth || 800;
          const svgH = svgRef.current?.clientHeight || 460;
          const tw = 200, th = 130;
          let left = tip.x + 16;
          let top  = tip.y - 80;
          if (left + tw > svgW) left = tip.x - tw - 8;
          if (top < 8) top = 8;
          if (top + th > svgH) top = svgH - th - 8;
          return (
            <div
              onMouseEnter={cancelHide}
              onMouseLeave={scheduleHide}
              style={{
                position: 'absolute', left, top,
                background: '#0D1526', border: '1px solid #25324D',
                borderRadius: '12px', padding: '12px 14px',
                zIndex: 50, width: `${tw}px`,
                boxShadow: '0 12px 32px rgba(0,0,0,0.7)',
                pointerEvents: 'auto',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                {tip.member.photo ? (
                  <img src={tip.member.photo} alt=""
                    style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover',
                      border: `2px solid ${color(tip.member.party)}`, flexShrink: 0 }} />
                ) : (
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0,
                    background: color(tip.member.party) + '22',
                    border: `2px solid ${color(tip.member.party)}44`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
                  }}>👤</div>
                )}
                <div>
                  <div style={{ fontWeight: 600, fontSize: '13px', color: '#F5F7FB', lineHeight: 1.3 }}>{tip.member.name}</div>
                  <div style={{ fontSize: '11px', color: '#7E8AA3', marginTop: '2px' }}>
                    {chamber === 'hor' ? tip.member.electorate : `Senator for ${tip.member.state}`}
                  </div>
                </div>
              </div>
              <div style={{
                display: 'inline-block',
                background: color(tip.member.party) + '22',
                border: `1px solid ${color(tip.member.party)}50`,
                borderRadius: '4px', padding: '3px 9px',
                fontSize: '11px', color: color(tip.member.party), fontWeight: 600,
              }}>{tip.member.party}</div>
              <div style={{ marginTop: '8px', borderTop: '1px solid #1C2940', paddingTop: '8px' }}>
                <Link href={`/electorates/${tip.member.id}`}
                  style={{ fontSize: '12px', color: '#4E8FD4', textDecoration: 'none', fontWeight: 500 }}>
                  View profile →
                </Link>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Legend + distribution bar */}
      <div style={{ background: '#0E1628', border: '1px solid #1C2940', borderRadius: '12px', padding: '20px', marginTop: '20px' }}>
        <p style={{ fontSize: '12px', color: '#4E5A73', margin: '0 0 14px', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
          Party composition — {chamber === 'hor' ? 'House of Representatives' : 'Senate'}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {partyList.map(p => (
            <button key={p}
              onMouseEnter={() => setHoverParty(p)} onMouseLeave={() => setHoverParty(null)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', cursor: 'pointer',
                border: `1px solid ${hoverParty === p ? color(p) : '#1C2940'}`,
                borderRadius: '8px', padding: '7px 12px', transition: 'border-color 0.15s',
              }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: color(p), flexShrink: 0 }} />
              <span style={{ fontSize: '13px', color: '#B6C0D1', fontWeight: 500 }}>{p}</span>
              <span style={{ fontSize: '13px', color: color(p), fontWeight: 700 }}>{counts[p]}</span>
            </button>
          ))}
        </div>

        <div style={{ marginTop: '20px' }}>
          <p style={{ fontSize: '12px', color: '#4E5A73', margin: '0 0 8px', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
            Seat distribution
          </p>
          <div style={{ height: '24px', borderRadius: '6px', overflow: 'hidden', display: 'flex', background: '#111A2E' }}>
            {partyList.map(p => (
              <div key={p} title={`${p}: ${counts[p]} seats`}
                style={{
                  width: `${(counts[p] / sorted.length) * 100}%`, background: color(p),
                  opacity: hoverParty && hoverParty !== p ? 0.2 : 1, transition: 'opacity 0.15s',
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
