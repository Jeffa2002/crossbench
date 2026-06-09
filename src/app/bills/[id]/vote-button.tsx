'use client';
import { useState } from 'react';
import Link from 'next/link';

type Position = 'SUPPORT' | 'OPPOSE' | 'ABSTAIN';
interface Props { billId: string; currentVote?: Position | null; isVerified: boolean; }
export default function VoteButton({ billId, currentVote, isVerified }: Props) {
  const [selected, setSelected] = useState<Position | null>(currentVote || null);
  const [loading, setLoading] = useState(false);
  const [comment, setComment] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isVerified) return (
    <div style={{ backgroundColor: '#111A2E', border: '1px solid #25324D', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
      <p style={{ color: '#F5F7FB', fontWeight: 600, marginBottom: '8px' }}>Verify your address to vote</p>
      <p style={{ color: '#B6C0D1', fontSize: '14px', marginBottom: '12px' }}>We need to confirm your electorate before you can vote.</p>
      <Link href="/account/verify" style={{ backgroundColor: '#2E8B57', color: '#fff', padding: '10px 14px', borderRadius: '8px', textDecoration: 'none', fontSize: '14px', fontWeight: 600, display: 'inline-block' }}>Verify my address →</Link>
    </div>
  );

  async function castVote() {
    if (!selected) {
      setError('Choose Support, Oppose, or Abstain before submitting.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billId, position: selected, comment: comment.trim() || undefined }),
      });
      if (res.ok) {
        setDone(true);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data?.error || 'Something went wrong. Please try again.');
        setSelected(currentVote || null);
      }
    } catch {
      setError('Network error. Please check your connection and try again.');
      setSelected(currentVote || null);
    } finally {
      setLoading(false);
    }
  }

  if (done) return (
    <div style={{ backgroundColor: '#111A2E', border: '1px solid #25324D', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
      <p style={{ color: '#F5F7FB', fontWeight: 600 }}>Vote recorded. Thanks.</p>
      <p style={{ color: '#B6C0D1', fontSize: '14px', marginTop: '4px' }}>You voted <strong>{selected}</strong> on this bill.</p>
    </div>
  );

  const buttons = [
    { position: 'SUPPORT', label: '👍 Support', color: 'border-[#2E8B57] text-[#B6C0D1] hover:bg-[#16213A]', active: 'bg-[#1A2B26] border-[#2E8B57] text-[#F5F7FB] font-bold' },
    { position: 'OPPOSE', label: '👎 Oppose', color: 'border-[#D95C4B] text-[#B6C0D1] hover:bg-[#16213A]', active: 'bg-[#2A1717] border-[#D95C4B] text-[#F5F7FB] font-bold' },
    { position: 'ABSTAIN', label: '🤷 Abstain', color: 'border-[#25324D] text-[#B6C0D1] hover:bg-[#16213A]', active: 'bg-[#16213A] border-[#6F7D95] text-[#F5F7FB] font-bold' },
  ] as const;

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-[#B6C0D1]">Choose your position:</p>
      <div className="bill-vote-choice-grid">
        {buttons.map(({ position, label, color, active }) => (
          <button
            key={position}
            type="button"
            onClick={() => { setSelected(position); setError(null); }}
            disabled={loading}
            className={`py-3 px-2 rounded-lg border text-sm transition-all ${selected === position ? active : color} disabled:opacity-50`}
          >
            {label}
          </button>
        ))}
      </div>
      {error && (
        <p style={{ fontSize: '13px', color: '#F08A7C', backgroundColor: 'rgba(217,92,75,0.1)', border: '1px solid rgba(217,92,75,0.25)', borderRadius: '8px', padding: '10px 14px', margin: 0 }}>
          {error}
        </p>
      )}
      <textarea
        value={comment}
        onChange={e => setComment(e.target.value)}
        maxLength={1000}
        placeholder="Add a comment (optional)"
        rows={2}
        className="w-full bg-[#16213A] border border-[#25324D] rounded-lg px-3 py-2 text-sm resize-none text-[#F5F7FB] focus:outline-none focus:ring-2 focus:ring-[#2E8B57]"
      />
      <button
        type="button"
        onClick={castVote}
        disabled={loading || !selected}
        className="w-full bg-[#2E8B57] text-white py-3 px-4 rounded-lg text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Recording vote...' : selected ? 'Submit vote' : 'Choose a position'}
      </button>
    </div>
  );
}
