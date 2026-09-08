'use client';

import { useEffect, useRef, useState } from 'react';

type SendPreview = {
  canSend: boolean;
  reason: string | null;
  draftHash: string;
  from: string;
  replyTo: string;
  recipient: string;
  subject: string;
  text: string;
  delivery: { id: string; status: string; sentAt: string | null; sentBy: string | null } | null;
};

const button = 'min-h-11 rounded-lg border border-[#42516E] bg-[#0B1220] px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-sky-400';

export default function SingleMediaSend({ contactId }: { contactId: string }) {
  const [preview, setPreview] = useState<SendPreview | null>(null);
  const [message, setMessage] = useState('Checking provider and delivery history…');
  const [review, setReview] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [sending, setSending] = useState(false);
  const busy = useRef(false);
  const endpoint = `/api/admin/media/send?contactId=${encodeURIComponent(contactId)}`;

  useEffect(() => {
    const abort = new AbortController();
    fetch(endpoint, { cache: 'no-store', signal: abort.signal }).then(async response => {
      const result = await response.json();
      if (abort.signal.aborted) return;
      if (!response.ok) throw new Error(result.error || 'Could not check sending availability.');
      setPreview(result);
      setMessage(result.reason || 'One recipient only. Nothing sends until you review and confirm.');
    }).catch(error => { if (!abort.signal.aborted) setMessage(error.message || 'Could not check sending availability.'); });
    return () => abort.abort();
  }, [endpoint]);

  async function sendOne() {
    if (busy.current || !review || !confirmed || !preview?.canSend) return;
    busy.current = true;
    setSending(true);
    setMessage('Submitting this one email. Do not close or repeat the request.');
    try {
      const response = await fetch('/api/admin/media/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId, draftHash: preview.draftHash, confirmed: true }),
      });
      const result = await response.json();
      setMessage(response.ok ? result.message : result.error || 'Could not confirm the outcome. Review the delivery record before trying again.');
    } catch {
      setMessage('The outcome could not be confirmed. Do not resend; check the delivery record before further action.');
    } finally {
      setPreview(current => current ? { ...current, canSend: false } : current);
      setSending(false);
      setReview(false);
      setConfirmed(false);
      try {
        const response = await fetch(endpoint, { cache: 'no-store' });
        if (response.ok) {
          const result = await response.json();
          setPreview({ ...result, canSend: false });
        }
      } catch {}
    }
  }

  return <section className="mt-5 space-y-3 rounded-lg border border-sky-800 p-3" aria-label="Manual single-recipient sending">
    <h3 className="font-semibold">Send this contact only</h3>
    <p className="break-words text-sm" role="status">{message}</p>
    {preview?.delivery && <p className="break-words text-xs text-[#B6C0D1]">
      Recorded outcome: {preview.delivery.status === 'SENT' ? 'Accepted by provider (not proof of inbox delivery)' : preview.delivery.status === 'PENDING' ? 'Pending or uncertain — do not resend' : preview.delivery.status === 'SKIPPED' ? 'Skipped / withheld — manual review required' : 'Failed — manual review required'}.
      {preview.delivery.sentAt && ` Recorded at ${new Date(preview.delivery.sentAt).toLocaleString()}.`}
      {preview.delivery.sentBy && ` Triggered by ${preview.delivery.sentBy}.`}
    </p>}
    {!review && <button type="button" className={button} disabled={!preview?.canSend || sending} onClick={() => { setReview(true); setConfirmed(false); }}>Review single email</button>}
    {review && preview && <div className="space-y-3" role="group" aria-label="Confirm one email">
      <dl className="space-y-1 break-words text-sm">
        <dt className="font-semibold">To — one recipient</dt><dd className="break-all">{preview.recipient}</dd>
        <dt className="font-semibold">From</dt><dd>{preview.from}</dd>
        <dt className="font-semibold">Replies go to</dt><dd>{preview.replyTo}</dd>
        <dt className="font-semibold">Subject</dt><dd>{preview.subject}</dd>
      </dl>
      <pre className="max-h-80 overflow-y-auto whitespace-pre-wrap break-words rounded-md bg-[#0B1220] p-3 font-sans text-sm" aria-label="Exact email to send">{preview.text}</pre>
      <label className="flex min-h-11 cursor-pointer items-start gap-3 py-2 text-sm">
        <input type="checkbox" className="mt-1 h-5 w-5 shrink-0" checked={confirmed} disabled={sending} onChange={event => setConfirmed(event.target.checked)} />
        I have reviewed this recipient, their contact guidance and this exact draft, and approve this one email.
      </label>
      <div className="flex flex-wrap gap-3">
        <button type="button" className={button} disabled={!confirmed || sending} onClick={sendOne}>{sending ? 'Sending one email…' : 'Confirm and send one email'}</button>
        <button type="button" className={button} disabled={sending} onClick={() => { setReview(false); setConfirmed(false); }}>Cancel — do not send</button>
      </div>
    </div>}
  </section>;
}
