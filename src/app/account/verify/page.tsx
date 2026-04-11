'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

interface Suggestion { display_name: string; lat: string; lon: string; }
interface Senator { id: string; name: string; state: string; mpName: string | null; mpParty: string | null; mpPhotoUrl: string | null; }
interface ElectorateResult { electorate: { id: string; name: string; state: string }; normalizedAddress: string; senators?: Senator[]; }

export default function VerifyPage() {
  const [address, setAddress] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [result, setResult] = useState<ElectorateResult | null>(null);
  const [error, setError] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Autocomplete with debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = address.trim();
    if (q.length < 4) { setSuggestions([]); setShowDropdown(false); return; }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=6&countrycodes=au&q=${encodeURIComponent(q)}`,
          { headers: { 'Accept-Language': 'en' } }
        );
        const data = await res.json();
        setSuggestions(data);
        setShowDropdown(data.length > 0);
      } catch { setSuggestions([]); }
      setLoading(false);
    }, 350);
  }, [address]);

  async function lookupAddress(addr: string) {
    setShowDropdown(false);
    setError(''); setResult(null);
    setLookingUp(true);
    const res = await fetch('/api/electorate/lookup?address=' + encodeURIComponent(addr));
    const data = await res.json();
    setLookingUp(false);
    if (!res.ok) { setError(data.error || 'Could not find your electorate. Try a more specific address.'); return; }
    setResult(data);
  }

  function selectSuggestion(s: Suggestion) {
    setAddress(s.display_name);
    setSuggestions([]);
    lookupAddress(s.display_name);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (address.trim()) lookupAddress(address.trim());
  }

  async function confirm() {
    if (!result) return;
    setSaving(true);
    const res = await fetch('/api/account/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ electorateId: result.electorate.id, addressHash: btoa(result.normalizedAddress) }),
    });
    setSaving(false);
    if (res.ok) setConfirmed(true);
    else setError('Something went wrong. Please try again.');
  }

  if (confirmed) return (
    <main className="min-h-screen bg-[#0B1220] flex items-center justify-center p-4 text-[#F5F7FB]">
      <div className="bg-[#111A2E] rounded-xl border border-[#25324D] p-8 max-w-md w-full text-center">
        <div className="text-4xl mb-4">✅</div>
        <h1 className="text-xl font-bold mb-2">Verified</h1>
        <p className="text-[#B6C0D1] mb-6">Your electorate is confirmed. You can now vote on bills.</p>
        <Link href="/bills" className="bg-[#2E8B57] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#25724A]">Browse bills →</Link>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen bg-[#0B1220] text-[#F5F7FB]">
      <header className="border-b border-[#25324D]">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link href="/" className="text-2xl font-bold text-[#F5F7FB]">Crossbench</Link>
        </div>
      </header>
      <div className="max-w-lg mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold mb-2">Verify your address</h1>
        <p className="text-[#B6C0D1] mb-8">
          We'll use your address to find your electorate. We don't store your address — only your electorate.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 mb-6">
          <div ref={wrapperRef} className="relative">
            <div className="relative">
              <input
                type="text"
                value={address}
                onChange={e => { setAddress(e.target.value); setResult(null); setError(''); }}
                onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
                placeholder="Start typing your address…"
                required
                autoComplete="off"
                className="w-full bg-[#16213A] border border-[#25324D] rounded-lg px-4 py-3 text-sm text-[#F5F7FB] focus:outline-none focus:ring-2 focus:ring-[#2E8B57]"
              />
              {loading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-[#2E8B57] border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>

            {/* Autocomplete dropdown */}
            {showDropdown && suggestions.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-[#16213A] border border-[#25324D] rounded-lg shadow-xl overflow-hidden">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onMouseDown={() => selectSuggestion(s)}
                    className="w-full text-left px-4 py-3 text-sm text-[#F5F7FB] hover:bg-[#1E2E4A] border-b border-[#25324D] last:border-0 truncate"
                  >
                    📍 {s.display_name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Only show button if no result yet and not auto-looking up */}
          {!result && !lookingUp && (
            <button
              type="submit"
              disabled={lookingUp || address.trim().length < 4}
              className="w-full bg-[#2E8B57] text-white py-3 rounded-lg font-medium hover:bg-[#25724A] disabled:opacity-40"
            >
              Find my electorate
            </button>
          )}

          {lookingUp && (
            <div className="w-full py-3 text-center text-sm text-[#7E8AA3]">
              <span className="inline-block w-4 h-4 border-2 border-[#2E8B57] border-t-transparent rounded-full animate-spin mr-2 align-middle" />
              Looking up your electorate…
            </div>
          )}
        </form>

        {error && (
          <div className="bg-[#2A1620] border border-[#D95C4B] text-[#F5F7FB] rounded-lg p-3 text-sm mb-4">
            {error}
          </div>
        )}

        {result && (
          <div className="bg-[#111A2E] border border-[#25324D] rounded-lg p-5">
            <p className="text-sm text-[#7E8AA3] mb-1">Your House of Reps electorate:</p>
            <p className="text-xl font-bold text-[#F5F7FB]">{result.electorate.name}</p>
            <p className="text-sm text-[#7E8AA3] mb-1">{result.electorate.state}</p>
            <p className="text-xs text-[#4E5A73] mb-4 truncate">{result.normalizedAddress}</p>
            {result.senators && result.senators.length > 0 && (
              <div className="mb-4 pt-4 border-t border-[#1C2940]">
                <p className="text-sm text-[#7E8AA3] mb-2">Your {result.electorate.state} Senators ({result.senators.length}):</p>
                <div className="flex flex-col gap-1">
                  {result.senators.map(s => (
                    <div key={s.id} className="flex items-center justify-between text-xs">
                      <span className="text-[#B6C0D1]">{s.mpName}</span>
                      <span className="text-[#4E5A73]">{s.mpParty}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <button
              onClick={confirm}
              disabled={saving}
              className="w-full bg-[#2E8B57] text-white py-3 rounded-lg font-medium hover:bg-[#25724A] disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Yes, confirm my electorate'}
            </button>
            <button
              onClick={() => { setResult(null); setAddress(''); }}
              className="w-full mt-2 text-[#7E8AA3] text-sm hover:text-[#B6C0D1]"
            >
              Try a different address
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
