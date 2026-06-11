'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';

export default function AcceptInviteClient() {
  const params = useSearchParams();
  const token = params.get('token') || '';
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  async function accept() {
    setStatus('loading');
    const res = await fetch('/api/mp/staff/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    const body = await res.json();
    if (!res.ok) {
      setStatus('error');
      if (res.status === 401) {
        setMessage('Sign in with the invited APH email address, then return to this invite link.');
        return;
      }
      setMessage(body.error || 'Could not accept this invite.');
      return;
    }
    setStatus('done');
    setMessage(`You now have access to the ${body.office.name} office dashboard.`);
  }

  return (
    <div className="page-container">
      <div style={{ maxWidth: '560px', margin: '40px auto', backgroundColor: '#111A2E', border: '1px solid #25324D', borderRadius: '12px', padding: '28px' }}>
        <h1 style={{ margin: '0 0 10px', fontSize: '24px' }}>Accept office invite</h1>
        <p style={{ color: '#7E8AA3', lineHeight: 1.6, margin: '0 0 22px' }}>
          Use the APH email address that received this invite.
        </p>

        {message && (
          <div style={{ backgroundColor: '#0B1220', border: '1px solid #25324D', borderRadius: '10px', padding: '12px 14px', color: status === 'error' ? '#D95C4B' : '#B6C0D1', marginBottom: '18px' }}>
            {message}
          </div>
        )}

        {status === 'done' ? (
          <Link href="/mp-dashboard" style={{ display: 'inline-block', backgroundColor: '#2E8B57', color: '#fff', padding: '12px 18px', borderRadius: '8px', textDecoration: 'none', fontWeight: 800 }}>
            Open dashboard
          </Link>
        ) : (
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button onClick={accept} disabled={!token || status === 'loading'} style={{ backgroundColor: '#2E8B57', color: '#fff', border: 0, padding: '12px 18px', borderRadius: '8px', fontWeight: 800 }}>
              {status === 'loading' ? 'Accepting...' : 'Accept invite'}
            </button>
            <Link href={`/login?next=/mp-dashboard/staff/accept?token=${encodeURIComponent(token)}`} style={{ color: '#B6C0D1', backgroundColor: '#16213A', border: '1px solid #25324D', padding: '12px 18px', borderRadius: '8px', textDecoration: 'none', fontWeight: 700 }}>
              Sign in first
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
