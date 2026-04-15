'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ChangeAddressButton({
  canChange,
  needsTicket,
  changesThisYear,
}: {
  canChange: boolean;
  needsTicket: boolean;
  changesThisYear: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showTicketPrompt, setShowTicketPrompt] = useState(false);

  async function handleClick() {
    if (needsTicket) {
      setShowTicketPrompt(true);
      return;
    }
    setLoading(true);
    const res = await fetch('/api/account/change-address', { method: 'POST' });
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      router.push('/account/verify?change=1');
    } else if (data.error === 'limit_reached') {
      setShowTicketPrompt(true);
    }
  }

  if (showTicketPrompt) {
    return (
      <div style={{ backgroundColor: '#1A2540', border: '1px solid #D6A94A55', borderRadius: '10px', padding: '14px 16px', maxWidth: '320px' }}>
        <p style={{ fontSize: '13px', color: '#D6A94A', fontWeight: 600, margin: '0 0 6px' }}>⚠️ Address change limit reached</p>
        <p style={{ fontSize: '12px', color: '#7E8AA3', margin: '0 0 12px', lineHeight: 1.5 }}>
          You've already changed your address once this year. To change it again, please submit a support ticket — our team will review and update it for you.
        </p>
        <div style={{ display: 'flex', gap: '8px' }}>
          <a href="/support" style={{ backgroundColor: '#2E8B57', color: '#fff', padding: '8px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, textDecoration: 'none' }}>
            Submit ticket →
          </a>
          <button onClick={() => setShowTicketPrompt(false)} style={{ backgroundColor: 'transparent', color: '#7E8AA3', border: '1px solid #25324D', padding: '8px 14px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      style={{
        backgroundColor: 'transparent',
        color: '#4E8FD4',
        border: '1px solid #4E8FD455',
        borderRadius: '8px',
        padding: '8px 16px',
        fontSize: '13px',
        fontWeight: 600,
        cursor: 'pointer',
        opacity: loading ? 0.6 : 1,
        flexShrink: 0,
      }}
    >
      {loading ? 'Checking…' : '📍 Change address'}
    </button>
  );
}
