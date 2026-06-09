'use client';

import { useMemo, useState } from 'react';

type BillTextReaderProps = {
  title: string;
  fullText: string;
  fetchedAt?: string | null;
  pdfUrl?: string | null;
  aphUrl?: string | null;
};

function normaliseText(text: string) {
  return text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

function makeSections(text: string) {
  const blocks = normaliseText(text).split(/\n{2,}/).filter(Boolean);
  const sections: Array<{ heading: string; body: string }> = [];
  let current: { heading: string; body: string } | null = null;

  for (const block of blocks) {
    const firstLine = block.split('\n')[0]?.trim() ?? '';
    const looksLikeHeading =
      firstLine.length < 90 &&
      (/^(Schedule|Part|Division|Subdivision|Chapter|Clause|Section|Item)\b/i.test(firstLine) ||
        /^[A-Z][A-Z\s,()0-9-]{8,}$/.test(firstLine));

    if (looksLikeHeading) {
      if (current) sections.push(current);
      current = { heading: firstLine, body: block.replace(firstLine, '').trim() };
    } else if (current) {
      current.body = [current.body, block].filter(Boolean).join('\n\n');
    } else {
      current = { heading: 'Opening text', body: block };
    }
  }

  if (current) sections.push(current);
  return sections.length ? sections : [{ heading: titleFromText(text), body: normaliseText(text) }];
}

function titleFromText(text: string) {
  return normaliseText(text).split('\n')[0]?.slice(0, 80) || 'Official bill text';
}

export default function BillTextReader({ title, fullText, fetchedAt, pdfUrl, aphUrl }: BillTextReaderProps) {
  const [query, setQuery] = useState('');
  const [showAll, setShowAll] = useState(false);
  const sections = useMemo(() => makeSections(fullText), [fullText]);
  const q = query.trim().toLowerCase();
  const visibleSections = useMemo(() => {
    if (!q) return showAll ? sections : sections.slice(0, 8);
    return sections.filter(section =>
      section.heading.toLowerCase().includes(q) || section.body.toLowerCase().includes(q)
    );
  }, [q, sections, showAll]);

  return (
    <section style={{ backgroundColor: '#111A2E', border: '1px solid #25324D', borderRadius: '12px', padding: '24px', marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: '16px' }}>
        <div>
          <p style={{ fontSize: '12px', fontWeight: 700, color: '#2E8B57', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Bill text reader
          </p>
          <h2 style={{ fontSize: '20px', lineHeight: 1.3, margin: '0 0 6px', color: '#F5F7FB' }}>Read the official bill in Crossbench</h2>
          <p style={{ color: '#7E8AA3', fontSize: '13px', lineHeight: 1.55, margin: 0, maxWidth: '68ch' }}>
            This is the official bill text indexed from parliament. Use search for names, agencies, dates, penalties, or sections before opening the PDF.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {fetchedAt && <span style={{ color: '#7E8AA3', fontSize: '12px', padding: '7px 10px', border: '1px solid #25324D', borderRadius: '999px' }}>Indexed {fetchedAt}</span>}
          {pdfUrl && <a href={pdfUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#7B93D4', fontSize: '13px', textDecoration: 'none', padding: '7px 10px', border: '1px solid #25324D', borderRadius: '999px' }}>PDF</a>}
          {aphUrl && <a href={aphUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#2E8B57', fontSize: '13px', textDecoration: 'none', padding: '7px 10px', border: '1px solid #25324D', borderRadius: '999px' }}>APH source</a>}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
        <input
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="Search official text..."
          aria-label={`Search official text for ${title}`}
          style={{ flex: '1 1 260px', backgroundColor: '#0B1220', border: '1px solid #25324D', borderRadius: '8px', color: '#F5F7FB', fontSize: '14px', padding: '11px 12px', outline: 'none' }}
        />
        <button
          type="button"
          onClick={() => setShowAll(value => !value)}
          style={{ backgroundColor: showAll ? '#2E8B57' : '#16213A', border: '1px solid #25324D', borderRadius: '8px', color: '#F5F7FB', fontSize: '13px', fontWeight: 700, padding: '10px 14px', cursor: 'pointer' }}
        >
          {showAll ? 'Show key sections' : 'Show full text'}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {visibleSections.map((section, index) => (
          <details key={`${section.heading}-${index}`} open={index < 2 || !!q} style={{ backgroundColor: '#0E1628', border: '1px solid #1C2940', borderRadius: '8px', overflow: 'hidden' }}>
            <summary style={{ cursor: 'pointer', padding: '13px 14px', color: '#C8D4E8', fontSize: '14px', fontWeight: 700 }}>
              {section.heading}
            </summary>
            <div style={{ borderTop: '1px solid #1C2940', padding: '14px', color: '#B6C0D1', fontSize: '15px', lineHeight: 1.75, whiteSpace: 'pre-wrap', maxWidth: '78ch' }}>
              {section.body || section.heading}
            </div>
          </details>
        ))}
      </div>

      {visibleSections.length === 0 && (
        <p style={{ color: '#7E8AA3', fontSize: '14px', margin: '18px 0 0' }}>No matching sections found.</p>
      )}
      {!q && !showAll && sections.length > visibleSections.length && (
        <p style={{ color: '#7E8AA3', fontSize: '12px', margin: '14px 0 0' }}>
          Showing the first {visibleSections.length} sections of {sections.length}. Use search or show full text for the rest.
        </p>
      )}
    </section>
  );
}
