'use client';

import { useState, useEffect } from 'react';

type Reply = { id: string; authorEmail: string; isAdmin: boolean; isAi: boolean; message: string; createdAt: string };
type Ticket = {
  id: string; email: string; name: string | null; subject: string; message: string;
  status: string; priority: string; aiSuggestedReply: string | null;
  createdAt: string; replies: Reply[];
  user: { email: string; name: string | null; role: string } | null;
};

const STATUS_COLORS: Record<string, string> = { OPEN: '#D6A94A', IN_PROGRESS: '#4E8FD4', RESOLVED: '#2E8B57', CLOSED: '#4A5568' };
const PRIORITY_COLORS: Record<string, string> = { LOW: '#4A5568', NORMAL: '#7E8AA3', HIGH: '#D6A94A', URGENT: '#D95C4B' };

function Badge({ label, color }: { label: string; color: string }) {
  return <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', backgroundColor: `${color}22`, color, border: `1px solid ${color}44` }}>{label}</span>;
}

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);

  async function load() {
    const res = await fetch(`/api/admin/support${statusFilter ? `?status=${statusFilter}` : ''}`);
    if (res.ok) {
      const data = await res.json();
      setTickets(data);
      if (selected) setSelected(data.find((t: Ticket) => t.id === selected.id) ?? null);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, [statusFilter]);

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/admin/support/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    load();
  }

  async function sendReply(ticketId: string) {
    if (!replyText.trim()) return;
    setReplying(true);
    await fetch(`/api/admin/support/${ticketId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: replyText }) });
    setReplyText('');
    setReplying(false);
    load();
  }

  function useAiSuggestion() {
    if (selected?.aiSuggestedReply) setReplyText(selected.aiSuggestedReply);
  }

  const counts = { OPEN: tickets.filter(t => t.status === 'OPEN').length, IN_PROGRESS: tickets.filter(t => t.status === 'IN_PROGRESS').length, RESOLVED: tickets.filter(t => t.status === 'RESOLVED').length };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1.4fr' : '1fr', gap: '16px', height: 'calc(100vh - 120px)' }}>
      {/* Ticket list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflow: 'auto' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 4px' }}>Support Tickets</h1>
          <div style={{ display: 'flex', gap: '10px', fontSize: '12px', color: '#7E8AA3', marginBottom: '14px' }}>
            <span style={{ color: '#D6A94A' }}>● {counts.OPEN} open</span>
            <span style={{ color: '#4E8FD4' }}>● {counts.IN_PROGRESS} in progress</span>
            <span style={{ color: '#2E8B57' }}>● {counts.RESOLVED} resolved</span>
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {['', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)} style={{
                padding: '5px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: '1px solid',
                borderColor: statusFilter === s ? '#4E8FD4' : '#25324D',
                backgroundColor: statusFilter === s ? '#4E8FD422' : '#111A2E',
                color: statusFilter === s ? '#4E8FD4' : '#7E8AA3',
              }}>{s || 'All'}</button>
            ))}
          </div>
        </div>

        {loading ? <p style={{ color: '#4A5568', fontSize: '13px' }}>Loading…</p> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {tickets.length === 0 && <p style={{ color: '#4A5568', fontSize: '13px' }}>No tickets.</p>}
            {tickets.map(t => (
              <div key={t.id} onClick={() => setSelected(t)} style={{
                backgroundColor: selected?.id === t.id ? '#1A2540' : '#111A2E',
                border: `1px solid ${selected?.id === t.id ? '#4E8FD4' : '#25324D'}`,
                borderRadius: '10px', padding: '14px 16px', cursor: 'pointer',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 600, fontSize: '14px', color: '#F5F7FB', flex: 1 }}>{t.subject}</span>
                  <div style={{ display: 'flex', gap: '5px', flexShrink: 0 }}>
                    <Badge label={t.status} color={STATUS_COLORS[t.status] || '#7E8AA3'} />
                    {t.priority !== 'NORMAL' && <Badge label={t.priority} color={PRIORITY_COLORS[t.priority] || '#7E8AA3'} />}
                  </div>
                </div>
                <p style={{ fontSize: '12px', color: '#7E8AA3', margin: '0 0 4px' }}>{t.name || t.email}</p>
                <p style={{ fontSize: '12px', color: '#3A4A6A', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.message}</p>
                <p style={{ fontSize: '11px', color: '#2A3A5A', margin: '6px 0 0' }}>{new Date(t.createdAt).toLocaleString('en-AU')} · {t.replies.length} repl{t.replies.length === 1 ? 'y' : 'ies'}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ticket detail */}
      {selected && (
        <div style={{ backgroundColor: '#111A2E', border: '1px solid #25324D', borderRadius: '12px', overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <div style={{ padding: '18px 20px', borderBottom: '1px solid #25324D' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 4px' }}>{selected.subject}</h2>
                <p style={{ fontSize: '12px', color: '#7E8AA3', margin: 0 }}>
                  {selected.name && `${selected.name} · `}{selected.email}
                  {selected.user && <span style={{ color: '#4E8FD4' }}> · {selected.user.role}</span>}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                {['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map(s => (
                  <button key={s} onClick={() => updateStatus(selected.id, s)} style={{
                    padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', border: '1px solid',
                    borderColor: selected.status === s ? STATUS_COLORS[s] : '#25324D',
                    backgroundColor: selected.status === s ? `${STATUS_COLORS[s]}22` : 'transparent',
                    color: selected.status === s ? STATUS_COLORS[s] : '#4A5568',
                  }}>{s.replace('_', ' ')}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Thread */}
          <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Original message */}
            <div style={{ backgroundColor: '#0E1628', borderRadius: '8px', padding: '14px' }}>
              <p style={{ fontSize: '11px', color: '#4A5568', margin: '0 0 8px' }}>Original message · {new Date(selected.createdAt).toLocaleString('en-AU')}</p>
              <p style={{ fontSize: '14px', color: '#F5F7FB', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{selected.message}</p>
            </div>

            {/* AI suggested reply */}
            {selected.aiSuggestedReply && (
              <div style={{ backgroundColor: '#0A1820', border: '1px solid rgba(46,139,87,0.3)', borderRadius: '8px', padding: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <p style={{ fontSize: '11px', color: '#2E8B57', margin: 0, fontWeight: 600 }}>✨ AI Suggested Reply</p>
                  <button onClick={useAiSuggestion} style={{ fontSize: '11px', color: '#2E8B57', background: 'none', border: '1px solid rgba(46,139,87,0.4)', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer' }}>Use this</button>
                </div>
                <p style={{ fontSize: '13px', color: '#B6C0D1', margin: 0, lineHeight: 1.5, fontStyle: 'italic' }}>{selected.aiSuggestedReply}</p>
              </div>
            )}

            {/* Replies */}
            {selected.replies.map(r => (
              <div key={r.id} style={{
                backgroundColor: r.isAdmin ? '#0D2818' : '#1A2540',
                border: `1px solid ${r.isAdmin ? 'rgba(46,139,87,0.2)' : '#25324D'}`,
                borderRadius: '8px', padding: '12px 14px',
              }}>
                <p style={{ fontSize: '11px', color: r.isAdmin ? '#2E8B57' : '#4A5568', margin: '0 0 6px', fontWeight: 600 }}>
                  {r.isAdmin ? '🛡 Admin' : '👤 User'} · {r.authorEmail} · {new Date(r.createdAt).toLocaleString('en-AU')}
                </p>
                <p style={{ fontSize: '14px', color: '#F5F7FB', margin: 0, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{r.message}</p>
              </div>
            ))}
          </div>

          {/* Reply box */}
          <div style={{ padding: '14px 20px', borderTop: '1px solid #25324D' }}>
            <textarea
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              placeholder="Write a reply…"
              rows={3}
              style={{ width: '100%', backgroundColor: '#16213A', border: '1px solid #25324D', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', color: '#F5F7FB', outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px', justifyContent: 'flex-end' }}>
              <button onClick={useAiSuggestion} disabled={!selected.aiSuggestedReply} style={{ fontSize: '13px', color: '#2E8B57', background: 'none', border: '1px solid rgba(46,139,87,0.3)', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', opacity: selected.aiSuggestedReply ? 1 : 0.3 }}>✨ Use AI suggestion</button>
              <button onClick={() => sendReply(selected.id)} disabled={replying || !replyText.trim()} style={{ backgroundColor: '#2E8B57', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 20px', fontWeight: 600, fontSize: '14px', cursor: 'pointer', opacity: replying || !replyText.trim() ? 0.5 : 1 }}>
                {replying ? 'Sending…' : 'Send reply'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
