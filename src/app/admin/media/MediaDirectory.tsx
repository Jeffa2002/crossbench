'use client';

import { useState } from 'react';
import { buildMediaOutreachEmail, mediaContactsCsv, mediaEmailStatus, type MediaContact } from '@/lib/media-outreach';
import SingleMediaSend from './SingleMediaSend';

const panel = 'rounded-xl border border-[#25324D] bg-[#111A2E] p-4 md:p-5';
const control = 'min-h-11 rounded-lg border border-[#42516E] bg-[#0B1220] px-3 py-2 text-sm text-[#F5F7FB] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400';

export default function MediaDirectory({ contacts, asOf }: { contacts: MediaContact[]; asOf: string }) {
  const [query, setQuery] = useState('');
  const [emailFilter, setEmailFilter] = useState('all');
  const [selectedId, setSelectedId] = useState(contacts[0]?.id ?? '');
  const [copyStatus, setCopyStatus] = useState('');
  const checkedOn = new Date(asOf);
  const published = contacts.filter(contact => mediaEmailStatus(contact, checkedOn) === 'Publicly listed').length;
  const filtered = contacts.filter(contact => {
    const matchesText = [contact.name, contact.outlet, contact.beat, contact.routeType, contact.email].join(' ').toLowerCase().includes(query.trim().toLowerCase());
    const status = mediaEmailStatus(contact, checkedOn);
    return matchesText && (emailFilter === 'all' || (emailFilter === 'published' ? status === 'Publicly listed' : status !== 'Publicly listed'));
  });
  const selected = contacts.find(contact => contact.id === selectedId);
  const draft = selected ? buildMediaOutreachEmail(selected) : undefined;

  async function copyDraft() {
    if (!draft) return;
    try {
      await navigator.clipboard.writeText(`Subject: ${draft.subject}\n\n${draft.plain}`);
      setCopyStatus('Draft copied. Copying does not send email.');
    } catch {
      setCopyStatus('Copy unavailable. Select the draft text and copy it manually.');
    }
  }

  function downloadContacts() {
    const url = URL.createObjectURL(new Blob(['\uFEFF', mediaContactsCsv(contacts, checkedOn)], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `crossbench-media-contacts-${asOf.slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-w-0 space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Media research & drafts</h1>
        <p className="mt-2 text-sm text-[#B6C0D1]">Political reporters, editorial desks and regional routes, with source evidence and individual briefing angles.</p>
        <button type="button" className={`${control} mt-3`} onClick={downloadContacts}>Download all contacts CSV</button>
      </header>
      <section className={`${panel} border-amber-700`} aria-label="Outreach safeguards">
        <h2 className="font-semibold text-amber-200">Manual sending — one reviewed contact at a time</h2>
        <p className="mt-2 text-sm text-[#DDE5F2]">A publicly listed address is not a delivery test, consent or approval to contact. Each email requires your review and explicit confirmation. There is no bulk send, background queue or automatic retry.</p>
        <p className="mt-2 text-sm text-[#B6C0D1]">Crossbench participation is self-selected, not representative polling. Check current facts and the contact’s guidance before sending. Previous attempts to the same email address are blocked against duplicates.</p>
      </section>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          ['Research contacts', contacts.length],
          ['Publicly sourced emails', published],
          ['Need source review / email', contacts.length - published],
          ['Recipients per confirmation', 1],
        ].map(([label, value]) => (
          <div key={label} className={panel}>
            <div className="text-2xl font-semibold">{value}</div>
            <div className="mt-1 text-xs text-[#B6C0D1]">{label}</div>
          </div>
        ))}
      </div>
      <section className={panel} aria-label="Contact filters">
        <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
          <label className="grid gap-2 text-sm" htmlFor="media-search">Find a contact, outlet or beat
            <input id="media-search" type="search" className={control} value={query} onChange={event => setQuery(event.target.value)} placeholder="Try Guardian, policy or Pilbara" />
          </label>
          <label className="grid gap-2 text-sm" htmlFor="media-status">Email source status
            <select id="media-status" className={control} value={emailFilter} onChange={event => setEmailFilter(event.target.value)}>
              <option value="all">All research contacts</option>
              <option value="published">Publicly listed, checked within 90 days</option>
              <option value="review">Needs email or source review</option>
            </select>
          </label>
        </div>
        <p className="mt-3 text-sm text-[#B6C0D1]" aria-live="polite">Showing {filtered.length} of {contacts.length} contacts. Source age assessed on {asOf.slice(0, 10)} (UTC).</p>
      </section>
      <div className="grid min-w-0 items-start gap-6 xl:grid-cols-2">
        <section aria-label="Research contacts" className="min-w-0 space-y-3">
          {filtered.length === 0 && <p className={panel}>No contacts match. Clear your search or change the status filter.</p>}
          {filtered.map(contact => (
            <article key={contact.id} className={`${panel} ${selectedId === contact.id ? 'ring-1 ring-sky-400' : ''}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="font-semibold">{contact.name}</h2>
                  <p className="text-sm text-[#DDE5F2]">{contact.outlet}</p>
                </div>
                <span className="rounded-md bg-[#16213A] px-2 py-1 text-xs text-[#DDE5F2]">{contact.priority}</span>
              </div>
              <p className="mt-2 text-xs text-[#B6C0D1]">{contact.routeType}</p>
              <p className="mt-2 break-all text-sm">{contact.email ?? 'No email researched — use the official outlet route after checking.'}</p>
              <p className="mt-1 text-xs text-amber-200">{mediaEmailStatus(contact, checkedOn)} · Individual review required</p>
              <p className="mt-3 text-sm text-[#DDE5F2]">{contact.pitchAngle}</p>
              <p className="mt-2 text-xs text-[#B6C0D1]">{contact.notes}</p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <a className="inline-flex min-h-11 items-center text-sm text-sky-300 underline underline-offset-4" href={contact.emailEvidence?.sourceUrl ?? contact.sourceUrl} target="_blank" rel="noopener noreferrer">
                  {contact.emailEvidence ? 'Email source evidence' : 'Role / outlet source (not email evidence)'}
                </a>
                {contact.emailEvidence && <span className="text-xs text-[#B6C0D1]">Checked {contact.emailEvidence.checkedAt}</span>}
              </div>
              <button type="button" className={`${control} mt-2 w-full`} aria-pressed={selectedId === contact.id} onClick={() => { setSelectedId(contact.id); setCopyStatus(''); }}>
                Preview draft for {contact.name}
              </button>
            </article>
          ))}
        </section>
        <section className={`${panel} min-w-0 xl:sticky xl:top-4`} aria-label="Draft preview">
          <h2 className="text-lg font-semibold">Tailored draft preview</h2>
          <label className="mt-4 grid gap-2 text-sm" htmlFor="draft-contact">Preview contact (independent of search)
            <select id="draft-contact" className={`${control} w-full min-w-0`} value={selectedId} onChange={event => { setSelectedId(event.target.value); setCopyStatus(''); }}>
              {contacts.map(contact => <option key={contact.id} value={contact.id}>{contact.name} — {contact.outlet}</option>)}
            </select>
          </label>
          {selected && draft && <>
            <p className="mt-3 text-xs text-[#B6C0D1]">Prepared for {selected.outlet}. Previewing does not send anything. Check the recorded outcome below before outreach.</p>
            <label className="mt-4 grid gap-2 text-sm" htmlFor="draft-subject">Subject
              <input id="draft-subject" className={`${control} w-full`} readOnly value={draft.subject} />
            </label>
            <label className="mt-4 grid gap-2 text-sm" htmlFor="draft-body">Draft text — review before confirming one email
              <textarea id="draft-body" className={`${control} w-full leading-relaxed`} rows={22} readOnly value={draft.plain} />
            </label>
            <div className="mt-4 flex flex-wrap gap-3">
              <button type="button" className={control} onClick={copyDraft}>Copy draft</button>
            </div>
            <p className="mt-2 text-sm text-[#B6C0D1]" role="status">{copyStatus}</p>
            <SingleMediaSend key={selected.id} contactId={selected.id} />
          </>}
        </section>
      </div>
    </div>
  );
}
