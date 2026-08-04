'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { supportMailboxSourcesFromMessage } from '@/lib/support-inbound';
import { SUPPORT_MESSAGE_MAX_LENGTH } from '@/lib/support-limits';

type Reply = { id: string; authorEmail: string; isAdmin: boolean; isAi: boolean; message: string; resendId: string | null; emailSentAt: string | null; emailError: string | null; attachmentNames: string | null; createdAt: string };
type SupportAttachment = { id: string; emailId: string; filename: string; contentType: string; size: number };
type Ticket = {
  id: string; email: string; name: string | null; subject: string; message: string;
  status: string; priority: string; aiSuggestedReply: string | null;
  createdAt: string; updatedAt: string; replies: Reply[];
  user: { email: string; name: string | null; role: string } | null;
};

const STATUS_COLORS: Record<string, string> = { OPEN: '#D6A94A', IN_PROGRESS: '#4E8FD4', RESOLVED: '#2E8B57', CLOSED: '#4A5568' };
const PRIORITY_COLORS: Record<string, string> = { LOW: '#4A5568', NORMAL: '#7E8AA3', HIGH: '#D6A94A', URGENT: '#D95C4B' };
const FOUNDER_EMAIL = 'jeffrey.e@crossbench.io';

function Badge({ label, color }: { label: string; color: string }) {
  return <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', backgroundColor: `${color}22`, color, border: `1px solid ${color}44` }}>{label}</span>;
}

function isFounderMarkedTicket(ticket: Ticket) {
  const haystack = [
    ticket.email,
    ticket.subject,
    ticket.message,
    ticket.user?.email,
    ...ticket.replies.flatMap(reply => [reply.authorEmail, reply.message]),
  ].filter(Boolean).join('\n').toLowerCase();

  return haystack.includes(FOUNDER_EMAIL);
}

function latestActivityAt(ticket: Ticket) {
  return ticket.replies[0]?.createdAt ?? ticket.updatedAt ?? ticket.createdAt;
}

function latestPreview(ticket: Ticket) {
  return ticket.replies[0]?.message ?? ticket.message;
}

function sortByLatestActivity(tickets: Ticket[]) {
  return [...tickets].sort((a, b) => new Date(latestActivityAt(b)).getTime() - new Date(latestActivityAt(a)).getTime());
}

function formatBytes(value: number) {
  if (value >= 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  if (value >= 1024) return `${Math.round(value / 1024)} KB`;
  return `${value} B`;
}

function attachmentUrl(ticketId: string, attachment: SupportAttachment) {
  const params = new URLSearchParams({
    ticketId,
    emailId: attachment.emailId,
    attachmentId: attachment.id,
  });
  return `/api/admin/support/attachments?${params.toString()}`;
}

function extractAttachments(message: string): SupportAttachment[] {
  const emailId = message.match(/Resend inbound email ID: ([^\s]+)/)?.[1];
  if (!emailId) return [];

  return message.split('\n').flatMap((line) => {
    const match = line.match(/^- (.+) \((.+), ([0-9]+) bytes, Resend attachment ID: ([^)]+)\)$/);
    if (!match) return [];
    return [{
      filename: match[1],
      contentType: match[2],
      size: Number(match[3]),
      id: match[4],
      emailId,
    }];
  });
}

function ticketAttachmentCount(ticket: Ticket) {
  return extractAttachments(ticket.message).length
    + ticket.replies.reduce((total, reply) => total + extractAttachments(reply.message).length, 0);
}

function ticketMailboxSources(ticket: Ticket) {
  return [...new Set([
    ...supportMailboxSourcesFromMessage(ticket.message),
    ...ticket.replies.flatMap(reply => supportMailboxSourcesFromMessage(reply.message)),
  ])];
}

function AttachmentLinks({ ticketId, message }: { ticketId: string; message: string }) {
  const attachments = extractAttachments(message);
  if (!attachments.length) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px' }}>
      <p style={{ color: '#D6A94A', fontSize: '11px', fontWeight: 700, margin: 0 }}>Attachments</p>
      {attachments.map(attachment => (
        <a
          key={`${attachment.emailId}:${attachment.id}`}
          href={attachmentUrl(ticketId, attachment)}
          target="_blank"
          rel="noreferrer"
          style={{
            alignSelf: 'flex-start',
            color: '#F5F7FB',
            backgroundColor: 'rgba(214,169,74,0.12)',
            border: '1px solid rgba(214,169,74,0.35)',
            borderRadius: '6px',
            padding: '6px 9px',
            fontSize: '12px',
            textDecoration: 'none',
          }}
        >
          {attachment.filename} · {formatBytes(attachment.size)}
        </a>
      ))}
    </div>
  );
}

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);
  const [replyError, setReplyError] = useState('');
  const [replyAttachments, setReplyAttachments] = useState<File[]>([]);
  const replyInput = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/support${statusFilter ? `?status=${statusFilter}` : ''}`);
    if (res.ok) {
      const data = await res.json();
      setTickets(sortByLatestActivity(data));
      setSelected(current => current ? data.find((t: Ticket) => t.id === current.id) ?? null : null);
    }
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/admin/support/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    load();
  }

  async function sendReply(ticketId: string) {
    if (!replyText.trim()) return;
    setReplying(true);
    setReplyError('');
    const form = new FormData();
    form.set('message', replyText);
    replyAttachments.forEach(file => form.append('attachments', file));
    const res = await fetch(`/api/admin/support/${ticketId}`, { method: 'PATCH', body: form });
    const data = await res.json().catch(() => null);
    if (res.ok) {
      const updated = data.ticket ?? data;
      setTickets(current => sortByLatestActivity(current.map(t => t.id === updated.id ? updated : t)));
      setSelected(updated);
      setReplyText('');
      setReplyAttachments([]);
      if (fileInput.current) fileInput.current.value = '';
    } else {
      setReplyError(data?.email?.error || data?.error || 'Reply saved, but email delivery failed.');
      if (data?.ticket) {
        setTickets(current => sortByLatestActivity(current.map(t => t.id === data.ticket.id ? data.ticket : t)));
        setSelected(data.ticket);
      }
    }
    setReplying(false);
  }

  function useAiSuggestion() {
    if (selected?.aiSuggestedReply) setReplyText(selected.aiSuggestedReply);
  }

  function wrapSelection(before: string, after = before, placeholder = 'text') {
    const input = replyInput.current;
    if (!input) return;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const selectedText = replyText.slice(start, end) || placeholder;
    const next = `${replyText.slice(0, start)}${before}${selectedText}${after}${replyText.slice(end)}`;
    setReplyText(next);
    requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(start + before.length, start + before.length + selectedText.length);
    });
  }

  function attachmentNames(value: string | null) {
    if (!value) return [];
    try { return JSON.parse(value) as string[]; } catch { return []; }
  }

  const counts = { OPEN: tickets.filter(t => t.status === 'OPEN').length, IN_PROGRESS: tickets.filter(t => t.status === 'IN_PROGRESS').length, RESOLVED: tickets.filter(t => t.status === 'RESOLVED').length };

  return (
    <div className={`support-admin-shell ${selected ? 'has-selected' : ''}`} style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1.4fr' : '1fr', gap: '16px', height: 'calc(100vh - 120px)' }}>
      {/* Ticket list */}
      <div className="support-ticket-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflow: 'auto' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 4px' }}>Support Tickets</h1>
          <div className="support-counts" style={{ display: 'flex', gap: '10px', fontSize: '12px', color: '#7E8AA3', marginBottom: '14px' }}>
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
            {tickets.map(t => {
              const founderMarked = isFounderMarkedTicket(t);
              const attachments = ticketAttachmentCount(t);
              const mailboxSources = ticketMailboxSources(t);
              return (
              <div key={t.id} className="support-ticket-card" onClick={() => setSelected(t)} style={{
                backgroundColor: founderMarked ? (selected?.id === t.id ? '#2B2310' : '#1C1A12') : (selected?.id === t.id ? '#1A2540' : '#111A2E'),
                border: `1px solid ${founderMarked ? '#D6A94A' : selected?.id === t.id ? '#4E8FD4' : '#25324D'}`,
                boxShadow: founderMarked ? '0 0 0 1px rgba(214,169,74,0.12)' : 'none',
                borderRadius: '10px', padding: '14px 16px', cursor: 'pointer',
              }}>
                <div className="support-ticket-card-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 600, fontSize: '14px', color: '#F5F7FB', flex: 1, minWidth: 0 }}>{t.subject}</span>
                  <div style={{ display: 'flex', gap: '5px', flexShrink: 0 }}>
                    {mailboxSources.map(source => <Badge key={source} label={source.toUpperCase()} color="#9B7EDB" />)}
                    {founderMarked && <Badge label="JEFFREY E" color="#D6A94A" />}
                    <Badge label={t.status} color={STATUS_COLORS[t.status] || '#7E8AA3'} />
                    {attachments > 0 && <Badge label={`${attachments} ATT`} color="#D6A94A" />}
                    {t.priority !== 'NORMAL' && <Badge label={t.priority} color={PRIORITY_COLORS[t.priority] || '#7E8AA3'} />}
                  </div>
                </div>
                <p style={{ fontSize: '12px', color: '#7E8AA3', margin: '0 0 4px' }}>{t.name || t.email}</p>
                <p style={{ fontSize: '12px', color: '#3A4A6A', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{latestPreview(t)}</p>
                <p style={{ fontSize: '11px', color: '#2A3A5A', margin: '6px 0 0' }}>Latest: {new Date(latestActivityAt(t)).toLocaleString('en-AU')} · {t.replies.length} repl{t.replies.length === 1 ? 'y' : 'ies'}</p>
              </div>
            );})}
          </div>
        )}
      </div>

      {/* Ticket detail */}
      {selected && (
        <div className="support-ticket-detail" style={{ backgroundColor: '#111A2E', border: '1px solid #25324D', borderRadius: '12px', overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <div style={{ padding: '18px 20px', borderBottom: '1px solid #25324D' }}>
            <button className="support-mobile-back" onClick={() => setSelected(null)}>← Tickets</button>
            <div className="support-detail-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ minWidth: 0 }}>
                {ticketMailboxSources(selected).map(source => (
                  <div key={source} style={{ marginBottom: '8px' }}>
                    <Badge label={`Source: ${source}`} color="#9B7EDB" />
                  </div>
                ))}
                {isFounderMarkedTicket(selected) && (
                  <div style={{ marginBottom: '8px' }}>
                    <Badge label={`Marked to ${FOUNDER_EMAIL}`} color="#D6A94A" />
                  </div>
                )}
                <h2 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 4px' }}>{selected.subject}</h2>
                <p style={{ fontSize: '12px', color: '#7E8AA3', margin: 0 }}>
                  {selected.name && `${selected.name} · `}{selected.email}
                  {selected.user && <span style={{ color: '#4E8FD4' }}> · {selected.user.role}</span>}
                </p>
              </div>
              <div className="support-status-actions" style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
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
                {r.isAdmin ? (
                  <div className="support-markdown" style={{ fontSize: '14px', color: '#F5F7FB', lineHeight: 1.5 }}><ReactMarkdown>{r.message}</ReactMarkdown></div>
                ) : (
                  <p style={{ fontSize: '14px', color: '#F5F7FB', margin: 0, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{r.message}</p>
                )}
                <AttachmentLinks ticketId={selected.id} message={r.message} />
                {attachmentNames(r.attachmentNames).length > 0 && (
                  <p style={{ fontSize: '12px', color: '#D6A94A', margin: '8px 0 0' }}>📎 {attachmentNames(r.attachmentNames).join(' · ')}</p>
                )}
                {r.isAdmin && (
                  <p style={{ fontSize: '11px', color: r.emailError ? '#D95C4B' : '#2E8B57', margin: '8px 0 0' }}>
                    {r.emailError ? `Email failed: ${r.emailError}` : r.emailSentAt ? `Email sent via Resend${r.resendId ? ` · ${r.resendId}` : ''}` : 'Email delivery not recorded'}
                  </p>
                )}
              </div>
            ))}

            {/* Original message */}
            <div style={{ backgroundColor: '#0E1628', borderRadius: '8px', padding: '14px' }}>
              <p style={{ fontSize: '11px', color: '#4A5568', margin: '0 0 8px' }}>Original message · {new Date(selected.createdAt).toLocaleString('en-AU')}</p>
              <p style={{ fontSize: '14px', color: '#F5F7FB', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{selected.message}</p>
              <AttachmentLinks ticketId={selected.id} message={selected.message} />
            </div>
          </div>

          {/* Reply box */}
          <div className="support-reply-box" style={{ padding: '14px 20px', borderTop: '1px solid #25324D' }}>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '7px', flexWrap: 'wrap' }}>
              <button type="button" onClick={() => wrapSelection('**')} title="Bold" style={{ background: '#16213A', border: '1px solid #25324D', color: '#F5F7FB', borderRadius: '5px', padding: '4px 9px', fontWeight: 700 }}>B</button>
              <button type="button" onClick={() => wrapSelection('_')} title="Italic" style={{ background: '#16213A', border: '1px solid #25324D', color: '#F5F7FB', borderRadius: '5px', padding: '4px 9px', fontStyle: 'italic' }}>I</button>
              <button type="button" onClick={() => wrapSelection('- ', '', 'list item')} title="Bulleted list" style={{ background: '#16213A', border: '1px solid #25324D', color: '#F5F7FB', borderRadius: '5px', padding: '4px 9px' }}>• List</button>
              <button type="button" onClick={() => wrapSelection('[', '](https://)', 'link text')} title="Link" style={{ background: '#16213A', border: '1px solid #25324D', color: '#F5F7FB', borderRadius: '5px', padding: '4px 9px' }}>Link</button>
            </div>
            <textarea
              ref={replyInput}
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              maxLength={SUPPORT_MESSAGE_MAX_LENGTH}
              placeholder="Write a reply…"
              rows={3}
              style={{ width: '100%', backgroundColor: '#16213A', border: '1px solid #25324D', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', color: '#F5F7FB', outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
            />
            <p style={{ margin: '4px 0 0', textAlign: 'right', fontSize: '11px', color: replyText.length >= SUPPORT_MESSAGE_MAX_LENGTH ? '#D95C4B' : '#4E5A73' }}>
              {replyText.length.toLocaleString()} / {SUPPORT_MESSAGE_MAX_LENGTH.toLocaleString()}
            </p>
            <div style={{ marginTop: '8px' }}>
              <input ref={fileInput} type="file" multiple onChange={event => setReplyAttachments(Array.from(event.target.files || []))} style={{ display: 'none' }} />
              <button type="button" onClick={() => fileInput.current?.click()} style={{ fontSize: '12px', color: '#D6A94A', background: 'none', border: '1px solid rgba(214,169,74,0.35)', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer' }}>📎 Add attachments</button>
              {replyAttachments.length > 0 && <span style={{ fontSize: '12px', color: '#B6C0D1', marginLeft: '8px' }}>{replyAttachments.map(file => file.name).join(' · ')}</span>}
              <span style={{ display: 'block', fontSize: '11px', color: '#4E5A73', marginTop: '4px' }}>Up to 6 files, 20MB total. Formatting uses Markdown.</span>
            </div>
            <div className="support-reply-actions" style={{ display: 'flex', gap: '8px', marginTop: '8px', justifyContent: 'flex-end' }}>
              {replyError && <span style={{ fontSize: '12px', color: '#D95C4B', marginRight: 'auto', alignSelf: 'center' }}>{replyError}</span>}
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
