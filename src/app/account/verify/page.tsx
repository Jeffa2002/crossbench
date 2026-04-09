'use client';
import { useState } from 'react';
import Link from 'next/link';

interface ElectorateResult { electorate: { id: string; name: string; state: string }; normalizedAddress: string; }

export default function VerifyPage() {
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ElectorateResult | null>(null);
  const [error, setError] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(''); setResult(null);
    const res = await fetch('/api/electorate/lookup?address=' + encodeURIComponent(address));
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error || 'Something went wrong. Please try again.'); return; }
    setResult(data);
  }
  async function confirm() {
    if (!result) return;
    setSaving(true);
    const res = await fetch('/api/account/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ electorateId: result.electorate.id, addressHash: btoa(result.normalizedAddress) }), });
    setSaving(false);
    if (res.ok) setConfirmed(true);
    else setError('Something went wrong. Please try again.');
  }

  if (confirmed) return (<main className="min-h-screen bg-[#0B1220] flex items-center justify-center p-4 text-[#F5F7FB]"><div className="bg-[#111A2E] rounded-xl border border-[#25324D] p-8 max-w-md w-full text-center"><div className="text-4xl mb-4">✅</div><h1 className="text-xl font-bold mb-2">Verified</h1><p className="text-[#B6C0D1] mb-6">Your electorate is confirmed. You can now vote on bills.</p><Link href="/bills" className="bg-[#2E8B57] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#25724A]">Browse bills →</Link></div></main>);

  return (<main className="min-h-screen bg-[#0B1220] text-[#F5F7FB]"><header className="border-b border-[#25324D]"><div className="max-w-4xl mx-auto px-4 py-4"><Link href="/" className="text-2xl font-bold text-[#F5F7FB]">Crossbench</Link></div></header><div className="max-w-lg mx-auto px-4 py-12"><h1 className="text-2xl font-bold mb-2">Verify your address</h1><p className="text-[#B6C0D1] mb-8">We'll use your address to find your electorate. We don't store your address — only your electorate.</p><form onSubmit={lookup} className="space-y-4 mb-6"><input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="e.g. 123 Main St, Sydney NSW 2000" required className="w-full bg-[#16213A] border border-[#25324D] rounded-lg px-4 py-3 text-sm text-[#F5F7FB] focus:outline-none focus:ring-2 focus:ring-[#2E8B57]" /><button type="submit" disabled={loading} className="w-full bg-[#2E8B57] text-white py-3 rounded-lg font-medium hover:bg-[#25724A] disabled:opacity-50">{loading ? 'Looking up...' : 'Find my electorate'}</button></form>{error && <div className="bg-[#2A1620] border border-[#D95C4B] text-[#F5F7FB] rounded-lg p-3 text-sm mb-4">{error}</div>}{result && (<div className="bg-[#111A2E] border border-[#25324D] rounded-lg p-5"><p className="text-sm text-[#7E8AA3] mb-1">Your federal electorate:</p><p className="text-xl font-bold text-[#F5F7FB]">{result.electorate.name}</p><p className="text-sm text-[#7E8AA3] mb-4">{result.electorate.state}</p><button onClick={confirm} disabled={saving} className="w-full bg-[#2E8B57] text-white py-3 rounded-lg font-medium hover:bg-[#25724A] disabled:opacity-50">{saving ? 'Saving...' : 'Yes, confirm my electorate'}</button><button onClick={() => setResult(null)} className="w-full mt-2 text-[#7E8AA3] text-sm hover:text-[#B6C0D1]">Try a different address</button></div>)}</div></main>);
}
