'use client';
import { useState } from 'react';

type Position = 'SUPPORT' | 'OPPOSE' | 'ABSTAIN';
interface Props { billId: string; currentVote?: Position | null; isVerified: boolean; }
export default function VoteButton({ billId, currentVote, isVerified }: Props) {
  const [selected, setSelected] = useState<Position | null>(currentVote || null);
  const [loading, setLoading] = useState(false);
  const [comment, setComment] = useState('');
  const [done, setDone] = useState(false);
  if (!isVerified) return (<div style={{ backgroundColor: '#111A2E', border: '1px solid #25324D', borderRadius: '12px', padding: '16px', textAlign: 'center' }}><p style={{ color: '#F5F7FB', fontWeight: 600, marginBottom: '8px' }}>Verify your address to vote</p><p style={{ color: '#B6C0D1', fontSize: '14px', marginBottom: '12px' }}>We need to confirm your electorate before you can vote.</p><a href="/account/verify" style={{ backgroundColor: '#2E8B57', color: '#fff', padding: '10px 14px', borderRadius: '8px', textDecoration: 'none', fontSize: '14px', fontWeight: 600, display: 'inline-block' }}>Verify my address →</a></div>);
  async function castVote(position: Position) { setLoading(true); setSelected(position); const res = await fetch('/api/vote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ billId, position, comment: comment || undefined }), }); setLoading(false); if (res.ok) setDone(true); }
  if (done) return (<div style={{ backgroundColor: '#111A2E', border: '1px solid #25324D', borderRadius: '12px', padding: '16px', textAlign: 'center' }}><p style={{ color: '#F5F7FB', fontWeight: 600 }}>Vote recorded. Thanks.</p><p style={{ color: '#B6C0D1', fontSize: '14px', marginTop: '4px' }}>You voted <strong>{selected}</strong> on this bill.</p></div>);
  const buttons = [{ position: 'SUPPORT', label: '👍 Support', color: 'border-[#2E8B57] text-[#B6C0D1] hover:bg-[#16213A]', active: 'bg-[#1A2B26] border-[#2E8B57] text-[#F5F7FB] font-bold' }, { position: 'OPPOSE', label: '👎 Oppose', color: 'border-[#D95C4B] text-[#B6C0D1] hover:bg-[#16213A]', active: 'bg-[#2A1717] border-[#D95C4B] text-[#F5F7FB] font-bold' }, { position: 'ABSTAIN', label: '🤷 Abstain', color: 'border-[#25324D] text-[#B6C0D1] hover:bg-[#16213A]', active: 'bg-[#16213A] border-[#6F7D95] text-[#F5F7FB] font-bold' }] as const;
  return (<div className="space-y-4"><p className="text-sm font-medium text-[#B6C0D1]">Cast your vote:</p><div className="grid grid-cols-3 gap-3">{buttons.map(({ position, label, color, active }) => (<button key={position} onClick={() => castVote(position)} disabled={loading} className={`py-3 px-2 rounded-lg border text-sm transition-all ${selected === position ? active : color} disabled:opacity-50`}>{label}</button>))}</div><textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Add a comment (optional)" rows={2} className="w-full bg-[#16213A] border border-[#25324D] rounded-lg px-3 py-2 text-sm resize-none text-[#F5F7FB] focus:outline-none focus:ring-2 focus:ring-[#2E8B57]" /></div>);
}
