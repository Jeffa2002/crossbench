'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

declare global {
  interface Window {
    grecaptcha: any;
    onRecaptchaLoad: () => void;
  }
}

export default function LoginPage() {
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/';
  const [email, setEmail] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [recaptchaReady, setRecaptchaReady] = useState(false);

  // Load reCAPTCHA v3 script
  useEffect(() => {
    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
    if (!siteKey || document.getElementById('recaptcha-script')) {
      setRecaptchaReady(true);
      return;
    }

    window.onRecaptchaLoad = () => setRecaptchaReady(true);
    const script = document.createElement('script');
    script.id = 'recaptcha-script';
    script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}&onload=onRecaptchaLoad`;
    script.async = true;
    document.head.appendChild(script);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!termsAccepted) { setError('Please accept the terms to continue.'); return; }
    setError('');
    setLoading(true);

    try {
      // Get reCAPTCHA v3 token
      let recaptchaToken = '';
      const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
      if (siteKey && recaptchaReady && window.grecaptcha) {
        recaptchaToken = await window.grecaptcha.execute(siteKey, { action: 'login' });
      }

      const res = await fetch('/api/auth/send-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, recaptchaToken, redirectTo: next }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.');
        return;
      }

      setSent(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <main className='min-h-screen bg-[#0B1220] flex items-center justify-center p-4 text-[#F5F7FB]'>
        <div className='bg-[#111A2E] rounded-xl border border-[#25324D] p-8 max-w-md w-full text-center'>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📬</div>
          <h1 className='text-2xl font-bold mb-2'>Check your email</h1>
          <p className='text-[#B6C0D1] mb-4'>
            We sent a sign-in link to <strong>{email}</strong>. Click the link in the email to continue.
          </p>
          <p className='text-xs text-[#7E8AA3]'>Didn&apos;t get it? Check your spam folder or{' '}
            <button onClick={() => setSent(false)} className='text-[#2E8B57] hover:underline'>try again</button>.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className='min-h-screen bg-[#0B1220] flex items-center justify-center p-4 text-[#F5F7FB]'>
      <div className='bg-[#111A2E] rounded-xl border border-[#25324D] p-8 max-w-md w-full'>
        <Link href='/' className='text-2xl font-bold text-[#F5F7FB] block mb-2'>Crossbench</Link>
        <h1 className='text-2xl font-bold mb-2'>Sign in</h1>
        <p className='text-[#B6C0D1] mb-6'>Enter your email and we&apos;ll send you a sign-in link.</p>

        <form onSubmit={handleSubmit} className='space-y-4'>
          <input
            type='email'
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder='your@email.com'
            required
            className='w-full bg-[#16213A] border border-[#25324D] rounded-lg px-4 py-3 text-sm text-[#F5F7FB] focus:outline-none focus:ring-2 focus:ring-[#2E8B57]'
          />
          <label className='flex items-start gap-3 cursor-pointer'>
            <input
              type='checkbox'
              checked={termsAccepted}
              onChange={e => setTermsAccepted(e.target.checked)}
              className='mt-1 w-4 h-4 accent-[#2E8B57] flex-shrink-0'
            />
            <span className='text-xs text-[#B6C0D1] leading-relaxed'>
              I have read and agree to the{' '}
              <Link href='/terms' className='text-[#2E8B57] hover:underline'>Terms of Service</Link>{' '}
              and{' '}
              <Link href='/privacy' className='text-[#2E8B57] hover:underline'>Privacy Policy</Link>.
              I confirm I am providing my own genuine information and will use my account honestly.
            </span>
          </label>

          {error && (
            <p className='text-sm text-red-400 bg-red-900/20 border border-red-800/40 rounded-lg px-4 py-2'>
              {error}
            </p>
          )}

          <button
            type='submit'
            disabled={loading || !email}
            className='w-full bg-[#2E8B57] text-white py-3 rounded-lg font-medium hover:bg-[#25724A] disabled:opacity-50 disabled:cursor-not-allowed'
          >
            {loading ? 'Sending…' : 'Continue with email'}
          </button>
        </form>

        <p className='text-xs text-[#7E8AA3] mt-4 text-center'>
          No password needed. Just a quick sign-in link.
        </p>
        <p className='text-[10px] text-[#4A5568] mt-3 text-center'>
          Protected by reCAPTCHA —{' '}
          <a href='https://policies.google.com/privacy' target='_blank' rel='noopener' className='hover:underline'>Privacy</a>{' '}
          &amp;{' '}
          <a href='https://policies.google.com/terms' target='_blank' rel='noopener' className='hover:underline'>Terms</a>
        </p>
      </div>
    </main>
  );
}
