'use client';

import { FormEvent, useState } from 'react';

type MpNewsletterFormProps = {
  initialEmail?: string;
};

type FormState = 'idle' | 'loading' | 'success' | 'error';

export default function MpNewsletterForm({ initialEmail = '' }: MpNewsletterFormProps) {
  const [email, setEmail] = useState(initialEmail);
  const [name, setName] = useState('');
  const [state, setState] = useState<FormState>('idle');
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState('loading');
    setMessage(null);

    const res = await fetch('/api/mp-newsletter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name, source: 'mp-updates' }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setState('error');
      setMessage(data.error || 'Could not subscribe that address.');
      return;
    }

    setState('success');
    setMessage(data.alreadySubscribed ? 'You are already subscribed.' : 'Subscribed. Future MP updates will go to this address.');
  }

  return (
    <form onSubmit={submit} style={{ display: 'grid', gap: '12px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
        <input
          type="email"
          required
          value={email}
          onChange={event => setEmail(event.target.value)}
          placeholder="name@aph.gov.au"
          style={{
            minWidth: 0,
            backgroundColor: '#0B1220',
            border: '1px solid #25324D',
            borderRadius: '8px',
            padding: '12px 14px',
            color: '#F5F7FB',
            fontSize: '14px',
            outline: 'none',
          }}
        />
        <input
          value={name}
          onChange={event => setName(event.target.value)}
          placeholder="Name or office"
          style={{
            minWidth: 0,
            backgroundColor: '#0B1220',
            border: '1px solid #25324D',
            borderRadius: '8px',
            padding: '12px 14px',
            color: '#F5F7FB',
            fontSize: '14px',
            outline: 'none',
          }}
        />
      </div>
      <button
        type="submit"
        disabled={state === 'loading'}
        style={{
          width: 'fit-content',
          backgroundColor: state === 'loading' ? '#1F6B45' : '#2E8B57',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          padding: '12px 18px',
          fontWeight: 800,
          fontSize: '14px',
          cursor: state === 'loading' ? 'wait' : 'pointer',
        }}
      >
        {state === 'loading' ? 'Subscribing...' : 'Subscribe to MP updates'}
      </button>
      {message && (
        <p
          role="status"
          style={{
            margin: 0,
            color: state === 'error' ? '#F2A7A0' : '#8FE3B0',
            fontSize: '13px',
            lineHeight: 1.5,
          }}
        >
          {message}
        </p>
      )}
      <p style={{ margin: 0, color: '#7E8AA3', fontSize: '12px', lineHeight: 1.6 }}>
        We will use this list for Crossbench product updates for MPs and Senators. Every newsletter will include an unsubscribe link.
      </p>
    </form>
  );
}
