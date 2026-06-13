'use client';
import { useEffect, useState } from 'react';

declare global {
  interface Window {
    grecaptcha: any;
    onAdminRecaptchaLoad: () => void;
  }
}

export default function AdminLoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [recaptchaReady, setRecaptchaReady] = useState(false);

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = '.grecaptcha-badge { visibility: hidden !important; }';
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  useEffect(() => {
    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
    if (!siteKey) {
      setRecaptchaReady(true);
      return;
    }

    if (window.grecaptcha) {
      setRecaptchaReady(true);
      return;
    }

    window.onAdminRecaptchaLoad = () => setRecaptchaReady(true);
    const existing = document.getElementById('recaptcha-script') as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', window.onAdminRecaptchaLoad, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = 'recaptcha-script';
    script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}&onload=onAdminRecaptchaLoad`;
    script.async = true;
    document.head.appendChild(script);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    let recaptchaToken = '';
    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
    if (siteKey && recaptchaReady && window.grecaptcha) {
      recaptchaToken = await window.grecaptcha.execute(siteKey, { action: 'admin_login' });
    }
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ password, recaptchaToken }),
    });
    setLoading(false);
    if (res.ok) {
      window.location.assign('/admin');
    } else {
      const j = await res.json().catch(() => ({}));
      setError(j.error || 'Invalid password');
    }
  }

  return (
    <main className="min-h-screen bg-[#0B1220] flex items-center justify-center p-4 text-[#F5F7FB]">
      <div className="bg-[#111A2E] border border-[#25324D] rounded-xl p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-2xl font-bold">Crossbench</div>
          <div className="text-xs font-mono text-[#4E5A73] mt-1 tracking-widest">ADMIN ACCESS</div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            required
            autoFocus
            className="w-full bg-[#16213A] border border-[#25324D] rounded-lg px-4 py-3 text-sm text-[#F5F7FB] focus:outline-none focus:ring-2 focus:ring-[#2E8B57]"
          />
          {error && <div className="text-red-400 text-sm">{error}</div>}
          <button
            type="submit"
            disabled={loading || !recaptchaReady}
            className="w-full bg-[#2E8B57] text-white py-3 rounded-lg font-medium hover:bg-[#25724A] disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="text-[10px] text-[#4E5A73] mt-4 text-center leading-relaxed">
          Protected by reCAPTCHA —{' '}
          <a href="https://policies.google.com/privacy" target="_blank" rel="noopener" className="hover:underline">Privacy</a>{' '}
          &amp;{' '}
          <a href="https://policies.google.com/terms" target="_blank" rel="noopener" className="hover:underline">Terms</a>
        </p>
      </div>
    </main>
  );
}
