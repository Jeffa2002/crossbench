'use client';

import { useState, useEffect, useMemo, useTransition } from 'react';
import Link from 'next/link';

type Mp = {
  id: string; name: string; state: string;
  mpId: string; mpName: string; mpParty: string | null;
  mpPhotoUrl: string | null; mpChamber: string | null;
  positive: number; negative: number;
};

type Party = {
  name: string; positive: number; negative: number;
  total: number; positivePct: number; mpCount: number;
};

type PulseStats = {
  totalResponses: number;
  activeMembers: number;
  verifiedShare: number;
  lastUpdated: string | null;
};

const PARTY_COLORS: Record<string, string> = {
  labor: '#E53E3E', liberal: '#3182CE', national: '#38A169',
  greens: '#48BB78', independent: '#805AD5', teal: '#319795',
  'one nation': '#F6A623', uap: '#F6A623',
};

function partyColor(p: string | null) {
  if (!p) return '#805AD5';
  const l = p.toLowerCase();
  for (const [k, v] of Object.entries(PARTY_COLORS)) if (l.includes(k)) return v;
  return '#6F7D95';
}

function confidenceLabel(total: number) {
  if (total >= 100) return { label: 'Verified signal', color: '#2E8B57' };
  if (total >= 25) return { label: 'Building sample', color: '#D6A94A' };
  if (total > 0) return { label: 'Low sample', color: '#7E8AA3' };
  return { label: 'No sample', color: '#4A5568' };
}

function fmtLastUpdated(value: string | null) {
  if (!value) return 'No responses yet';
  const date = new Date(value);
  const minutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 1440) return `${Math.round(minutes / 60)} hr ago`;
  return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function normalizeSearch(value: string | null | undefined) {
  return (value || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function normalizeChamber(value: string | null) {
  return value?.toLowerCase().includes('senate') ? 'Senate' : 'House';
}

function hasAddressVerification(me: any) {
  return !!(
    me?.verifiedAt &&
    me?.electorateId &&
    me?.electorateVerified &&
    ['ADDRESS', 'IDENTITY'].includes(me?.verificationStatus)
  );
}

function ThumbButton({ active, type, count, onClick, disabled }: {
  active: boolean; type: 'up' | 'down'; count: number;
  onClick: () => void; disabled: boolean;
}) {
  const isUp = type === 'up';
  const activeColor = isUp ? '#2E8B57' : '#D95C4B';
  const activeBg = isUp ? 'rgba(46,139,87,0.15)' : 'rgba(217,92,75,0.15)';
  const activeBorder = isUp ? 'rgba(46,139,87,0.5)' : 'rgba(217,92,75,0.5)';
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'flex', alignItems: 'center', gap: '5px',
        padding: '5px 10px', borderRadius: '8px', border: '1px solid',
        borderColor: active ? activeBorder : '#25324D',
        backgroundColor: active ? activeBg : 'transparent',
        color: active ? activeColor : '#7E8AA3',
        fontSize: '13px', fontWeight: active ? 700 : 400,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.15s', opacity: disabled && !active ? 0.5 : 1,
      }}
      onMouseEnter={e => { if (!disabled) (e.currentTarget as HTMLButtonElement).style.backgroundColor = active ? activeBg : 'rgba(255,255,255,0.04)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = active ? activeBg : 'transparent'; }}
    >
      {isUp ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/>
          <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/>
          <path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/>
        </svg>
      )}
      <span>{count}</span>
    </button>
  );
}

function MpCard({ mp, userVote, onVote, canVote }: {
  mp: Mp; userVote: string | null;
  onVote: (mpId: string, s: 'POSITIVE' | 'NEGATIVE' | null) => void;
  canVote: boolean;
}) {
  const total = mp.positive + mp.negative;
  const posPct = total > 0 ? Math.round((mp.positive / total) * 100) : 0;
  const color = partyColor(mp.mpParty);
  const confidence = confidenceLabel(total);

  function handleClick(type: 'POSITIVE' | 'NEGATIVE') {
    if (!canVote) return;
    onVote(mp.mpId, userVote === type ? null : type);
  }

  return (
    <div style={{
      backgroundColor: '#111A2E', border: '1px solid #25324D', borderRadius: '10px',
      padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px',
    }}>
      {/* Photo */}
      <div style={{ width: '44px', height: '44px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, backgroundColor: '#1A2540', border: `2px solid ${color}` }}>
        {mp.mpPhotoUrl ? (
          <img src={mp.mpPhotoUrl} alt={mp.mpName} referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>👤</div>
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <Link href={`/electorates/${mp.id}`} style={{ fontSize: '14px', fontWeight: 600, color: '#F5F7FB', textDecoration: 'none', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {mp.mpName}
        </Link>
        <p style={{ fontSize: '11px', margin: '1px 0 4px', color }}>
          {mp.mpParty || 'Independent'} · {mp.mpChamber === 'Senate' ? 'Senator' : 'MP'} · {mp.state}
        </p>
        {/* Approval bar */}
        {total > 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ flex: 1, height: '4px', backgroundColor: '#16213A', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${posPct}%`, backgroundColor: '#2E8B57', borderRadius: '2px', transition: 'width 0.3s' }} />
            </div>
            <span style={{ fontSize: '10px', color: '#7E8AA3', flexShrink: 0 }}>{posPct}% 👍 · {total.toLocaleString()} votes</span>
          </div>
        ) : (
          <p style={{ fontSize: '10px', color: '#3A4A6A', margin: 0 }}>No ratings yet</p>
        )}
        <span style={{ display: 'inline-block', marginTop: '5px', color: confidence.color, border: `1px solid ${confidence.color}55`, borderRadius: '999px', padding: '2px 7px', fontSize: '10px', fontWeight: 700 }}>
          {confidence.label}
        </span>
      </div>

      {/* Thumbs */}
      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
        <ThumbButton type="up" active={userVote === 'POSITIVE'} count={mp.positive} onClick={() => handleClick('POSITIVE')} disabled={!canVote} />
        <ThumbButton type="down" active={userVote === 'NEGATIVE'} count={mp.negative} onClick={() => handleClick('NEGATIVE')} disabled={!canVote} />
      </div>
    </div>
  );
}

export default function SentimentClient({ mps, parties, stats }: { mps: Mp[]; parties: Party[]; stats: PulseStats }) {
  const [filter, setFilter] = useState('');
  const [chamberFilter, setChamberFilter] = useState<'all' | 'House' | 'Senate'>('all');
  const [partyFilter, setPartyFilter] = useState('');
  const [userVotes, setUserVotes] = useState<Record<string, string>>({});
  const [localCounts, setLocalCounts] = useState<Record<string, { positive: number; negative: number }>>({});
  const [canVote, setCanVote] = useState(false);
  const [authStatus, setAuthStatus] = useState<'loading' | 'none' | 'unverified' | 'verified'>('loading');
  const [, startTransition] = useTransition();

  // Fetch user's existing votes + auth status
  useEffect(() => {
    async function init() {
      const allMpIds = mps.map(m => m.mpId).filter(Boolean);
      if (!allMpIds.length) return;

      // Check auth
      const authRes = await fetch('/api/auth/session');
      const authData = await authRes.json();
      const userId = authData?.user?.id;

      if (!userId) { setAuthStatus('none'); return; }

      // Check verification
      const meRes = await fetch('/api/me');
      if (meRes.ok) {
        const me = await meRes.json();
        if (hasAddressVerification(me)) {
          setCanVote(true);
          setAuthStatus('verified');
        } else {
          setAuthStatus('unverified');
        }
      }

      // Load user votes in batches of 50
      const votes: Record<string, string> = {};
      for (let i = 0; i < allMpIds.length; i += 50) {
        const chunk = allMpIds.slice(i, i + 50);
        const res = await fetch(`/api/sentiment?mpIds=${chunk.join(',')}`);
        if (res.ok) {
          const data = await res.json();
          for (const [mpId, info] of Object.entries(data as any)) {
            if ((info as any).userVote) votes[mpId] = (info as any).userVote;
          }
        }
      }
      setUserVotes(votes);
    }
    init();
  }, [mps]);

  function handleVote(mpId: string, sentiment: 'POSITIVE' | 'NEGATIVE' | null) {
    if (!canVote) return;

    const prev = userVotes[mpId] ?? null;
    // Optimistic update
    setUserVotes(v => {
      const next = { ...v };
      if (!sentiment) delete next[mpId]; else next[mpId] = sentiment;
      return next;
    });
    setLocalCounts(c => {
      const mp = mps.find(m => m.mpId === mpId)!;
      const base = c[mpId] ?? { positive: mp.positive, negative: mp.negative };
      const updated = { ...base };
      // Remove old vote
      if (prev === 'POSITIVE') updated.positive = Math.max(0, updated.positive - 1);
      if (prev === 'NEGATIVE') updated.negative = Math.max(0, updated.negative - 1);
      // Add new vote
      if (sentiment === 'POSITIVE') updated.positive += 1;
      if (sentiment === 'NEGATIVE') updated.negative += 1;
      return { ...c, [mpId]: updated };
    });

    startTransition(async () => {
      await fetch('/api/sentiment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mpId, sentiment }),
      });
    });
  }

  // Merge server counts with optimistic local updates
  function getCounts(mp: Mp) {
    return localCounts[mp.mpId] ?? { positive: mp.positive, negative: mp.negative };
  }

  const filteredMps = useMemo(() => {
    const q = normalizeSearch(filter);
    return mps.filter(mp => {
      const haystack = [
        mp.mpName,
        mp.mpParty || 'Independent',
        mp.state,
        mp.name,
        normalizeChamber(mp.mpChamber),
      ].map(normalizeSearch).join(' ');
      const nameMatch = !q || haystack.includes(q);
      const chamberMatch = chamberFilter === 'all' || normalizeChamber(mp.mpChamber) === chamberFilter;
      const partyMatch = !partyFilter || (mp.mpParty || 'Independent') === partyFilter;
      return nameMatch && chamberMatch && partyMatch;
    });
  }, [mps, filter, chamberFilter, partyFilter]);

  const uniqueParties = [...new Set(mps.map(m => m.mpParty || 'Independent'))].sort();
  const activeTopics = ['All current politics', 'Cost of living', 'Housing', 'Integrity', 'Climate', 'Healthcare'];

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 16px' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <p style={{ color: '#2E8B57', fontSize: '12px', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 10px' }}>Crossbench member sentiment</p>
        <h1 style={{ fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 800, lineHeight: 1.1, margin: '0 0 12px', letterSpacing: 0 }}>Politics Pulse</h1>
        <p style={{ color: '#B6C0D1', margin: 0, fontSize: '16px', lineHeight: 1.65, maxWidth: '76ch' }}>
          A live view of how verified Crossbench members are rating parties, MPs, and Senators. This is a participation signal, not a scientific population poll.
        </p>
        {authStatus === 'none' && (
          <div style={{ marginTop: '12px', backgroundColor: '#111A2E', border: '1px solid #25324D', borderRadius: '8px', padding: '12px 16px', fontSize: '13px', color: '#B6C0D1' }}>
            <Link href='/login' style={{ color: '#2E8B57', fontWeight: 600 }}>Sign in</Link> to rate MPs.
          </div>
        )}
        {authStatus === 'unverified' && (
          <div style={{ marginTop: '12px', backgroundColor: '#111A2E', border: '1px solid #D6A94A', borderRadius: '8px', padding: '12px 16px', fontSize: '13px', color: '#B6C0D1' }}>
            <Link href='/account/verify' style={{ color: '#D6A94A', fontWeight: 600 }}>Verify your address</Link> to rate MPs.
          </div>
        )}
      </div>

      <div className="pulse-stat-grid" style={{ marginBottom: '18px' }}>
        {[
          { label: 'Active responses', value: stats.activeMembers.toLocaleString() },
          { label: 'Verified share', value: `${stats.verifiedShare}%` },
          { label: 'Representatives tracked', value: mps.length.toLocaleString() },
          { label: 'Last updated', value: fmtLastUpdated(stats.lastUpdated) },
        ].map(item => (
          <div key={item.label} style={{ backgroundColor: '#111A2E', border: '1px solid #25324D', borderRadius: '10px', padding: '16px' }}>
            <p style={{ color: '#7E8AA3', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 8px', fontWeight: 700 }}>{item.label}</p>
            <p style={{ color: '#F5F7FB', fontSize: '22px', fontWeight: 800, margin: 0 }}>{item.value}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '32px' }}>
        {activeTopics.map((topic, index) => (
          <span key={topic} style={{
            color: index === 0 ? '#F5F7FB' : '#B6C0D1',
            backgroundColor: index === 0 ? '#2E8B57' : '#111A2E',
            border: '1px solid #25324D',
            borderRadius: '999px',
            padding: '7px 11px',
            fontSize: '12px',
            fontWeight: 700,
          }}>
            {topic}
          </span>
        ))}
      </div>

      {/* Party leaderboard */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '14px' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 750, margin: '0 0 4px', color: '#F5F7FB' }}>Party sentiment board</h2>
            <p style={{ color: '#7E8AA3', fontSize: '13px', lineHeight: 1.55, margin: 0 }}>Approval and concern are aggregated from member ratings of each party's representatives.</p>
          </div>
          <Link href="/methodology" style={{ color: '#2E8B57', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>Methodology</Link>
        </div>
        <div className="party-pulse-grid">
          {parties.filter(p => p.total > 0).sort((a, b) => b.positivePct - a.positivePct).map(party => (
            <div key={party.name} style={{ backgroundColor: '#111A2E', border: '1px solid #25324D', borderRadius: '10px', padding: '16px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: partyColor(party.name) }}>{party.name}</span>
                  <p style={{ fontSize: '11px', color: '#4A5568', margin: '3px 0 0' }}>{party.mpCount} MPs/Senators · {confidenceLabel(party.total).label}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '24px', color: '#F5F7FB', fontWeight: 800, lineHeight: 1 }}>{party.positivePct}%</div>
                  <div style={{ fontSize: '10px', color: '#7E8AA3', fontWeight: 700 }}>approval</div>
                </div>
              </div>
              <div style={{ height: '6px', backgroundColor: '#16213A', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${party.positivePct}%`, backgroundColor: partyColor(party.name), opacity: 0.8, borderRadius: '3px', transition: 'width 0.4s' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', color: '#7E8AA3', fontSize: '12px' }}>
                <span style={{ color: '#2E8B57', fontWeight: 700 }}>Approve {party.positive.toLocaleString()}</span>
                <span style={{ color: '#D95C4B', fontWeight: 700 }}>Concern {party.negative.toLocaleString()}</span>
                <span>{party.total.toLocaleString()} total</span>
              </div>
            </div>
          ))}
          {parties.every(p => p.total === 0) && (
            <p style={{ color: '#4A5568', fontSize: '13px' }}>No ratings yet — be the first!</p>
          )}
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search name, party, state…"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          style={{ flex: '1 1 200px', backgroundColor: '#111A2E', border: '1px solid #25324D', borderRadius: '8px', padding: '9px 14px', fontSize: '13px', color: '#F5F7FB', outline: 'none' }}
        />
        <select value={chamberFilter} onChange={e => setChamberFilter(e.target.value as any)}
          style={{ backgroundColor: '#111A2E', border: '1px solid #25324D', borderRadius: '8px', padding: '9px 14px', fontSize: '13px', color: '#F5F7FB' }}>
          <option value="all">All chambers</option>
          <option value="House">House of Reps</option>
          <option value="Senate">Senate</option>
        </select>
        <select value={partyFilter} onChange={e => setPartyFilter(e.target.value)}
          style={{ backgroundColor: '#111A2E', border: '1px solid #25324D', borderRadius: '8px', padding: '9px 14px', fontSize: '13px', color: '#F5F7FB' }}>
          <option value="">All parties</option>
          {uniqueParties.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* MP count */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', margin: '0 0 12px', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 750, margin: '0 0 4px', color: '#F5F7FB' }}>Member leaderboard</h2>
          <p style={{ fontSize: '12px', color: '#4A5568', margin: 0 }}>
            Showing {filteredMps.length} of {mps.length} representatives
          </p>
        </div>
        <span style={{ color: '#7E8AA3', fontSize: '12px', border: '1px solid #25324D', borderRadius: '999px', padding: '6px 10px' }}>One rating per verified member</span>
      </div>

      {/* MP list */}
      <div key={`${filter}-${chamberFilter}-${partyFilter}`} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {filteredMps.map(mp => {
          const counts = getCounts(mp);
          return (
            <MpCard
              key={mp.mpId}
              mp={{ ...mp, ...counts }}
              userVote={userVotes[mp.mpId] ?? null}
              onVote={handleVote}
              canVote={canVote}
            />
          );
        })}
        {filteredMps.length === 0 && (
          <div style={{ backgroundColor: '#111A2E', border: '1px solid #25324D', borderRadius: '10px', padding: '18px', color: '#7E8AA3', fontSize: '14px' }}>
            No representatives match those filters.
          </div>
        )}
      </div>
    </div>
  );
}
