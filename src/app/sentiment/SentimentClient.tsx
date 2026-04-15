'use client';

import { useState, useEffect, useTransition } from 'react';
import Image from 'next/image';
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
        padding: '5px 10px', borderRadius: '20px', border: '1px solid',
        borderColor: active ? activeBorder : '#25324D',
        backgroundColor: active ? activeBg : 'transparent',
        color: active ? activeColor : '#7E8AA3',
        fontSize: '13px', fontWeight: active ? 700 : 400,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.15s', opacity: disabled && !active ? 0.5 : 1,
      }}
    >
      <span style={{ fontSize: '15px' }}>{isUp ? '👍' : '👎'}</span>
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
          <img src={mp.mpPhotoUrl} alt={mp.mpName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
      </div>

      {/* Thumbs */}
      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
        <ThumbButton type="up" active={userVote === 'POSITIVE'} count={mp.positive} onClick={() => handleClick('POSITIVE')} disabled={!canVote} />
        <ThumbButton type="down" active={userVote === 'NEGATIVE'} count={mp.negative} onClick={() => handleClick('NEGATIVE')} disabled={!canVote} />
      </div>
    </div>
  );
}

export default function SentimentClient({ mps, parties }: { mps: Mp[]; parties: Party[] }) {
  const [filter, setFilter] = useState('');
  const [chamberFilter, setChamberFilter] = useState<'all' | 'House' | 'Senate'>('all');
  const [partyFilter, setPartyFilter] = useState('');
  const [userVotes, setUserVotes] = useState<Record<string, string>>({});
  const [localCounts, setLocalCounts] = useState<Record<string, { positive: number; negative: number }>>({});
  const [canVote, setCanVote] = useState(false);
  const [authStatus, setAuthStatus] = useState<'loading' | 'none' | 'unverified' | 'verified'>('loading');
  const [isPending, startTransition] = useTransition();

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
        if (me.verificationStatus && me.verificationStatus !== 'NONE') {
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
  }, []);

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

  const filteredMps = mps.filter(mp => {
    const q = filter.toLowerCase();
    const nameMatch = !q || mp.mpName.toLowerCase().includes(q) || (mp.mpParty || '').toLowerCase().includes(q) || mp.state.toLowerCase().includes(q) || mp.name.toLowerCase().includes(q);
    const chamberMatch = chamberFilter === 'all' || mp.mpChamber === chamberFilter;
    const partyMatch = !partyFilter || (mp.mpParty || 'Independent') === partyFilter;
    return nameMatch && chamberMatch && partyMatch;
  });

  const uniqueParties = [...new Set(mps.map(m => m.mpParty || 'Independent'))].sort();

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '32px 16px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, margin: '0 0 8px' }}>Live MP Sentiment</h1>
        <p style={{ color: '#7E8AA3', margin: 0 }}>How Australians feel about their representatives. Rate any MP or Senator — one 👍 or 👎 per person.</p>
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

      {/* Party leaderboard */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 14px', color: '#F5F7FB' }}>Party approval</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {parties.filter(p => p.total > 0).sort((a, b) => b.positivePct - a.positivePct).map(party => (
            <div key={party.name} style={{ backgroundColor: '#111A2E', border: '1px solid #25324D', borderRadius: '10px', padding: '14px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: partyColor(party.name) }}>{party.name}</span>
                  <span style={{ fontSize: '11px', color: '#4A5568', marginLeft: '8px' }}>{party.mpCount} MPs</span>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: '#2E8B57', fontWeight: 600 }}>👍 {party.positivePct}%</span>
                  <span style={{ fontSize: '13px', color: '#D95C4B' }}>👎 {100 - party.positivePct}%</span>
                  <span style={{ fontSize: '11px', color: '#4A5568' }}>{party.total.toLocaleString()} ratings</span>
                </div>
              </div>
              <div style={{ height: '6px', backgroundColor: '#16213A', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${party.positivePct}%`, backgroundColor: partyColor(party.name), opacity: 0.8, borderRadius: '3px', transition: 'width 0.4s' }} />
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
      <p style={{ fontSize: '12px', color: '#4A5568', margin: '0 0 12px' }}>
        Showing {filteredMps.length} of {mps.length} representatives
      </p>

      {/* MP list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
      </div>
    </div>
  );
}
