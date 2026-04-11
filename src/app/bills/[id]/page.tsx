import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import VoteButton from './vote-button';
import Nav from '@/components/Nav';

export const revalidate = 60;

async function getBillResults(billId: string) {
  const votes = await prisma.vote.groupBy({
    by: ['position'],
    where: { billId },
    _count: true,
  });
  const total = votes.reduce((sum, v) => sum + v._count, 0);
  const support = votes.find(v => v.position === 'SUPPORT')?._count || 0;
  const oppose = votes.find(v => v.position === 'OPPOSE')?._count || 0;
  const abstain = votes.find(v => v.position === 'ABSTAIN')?._count || 0;
  return { total, support, oppose, abstain };
}

function fmt(d: Date | null | undefined) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtRel(d: Date | null | undefined) {
  if (!d) return null;
  const diff = Math.round((Date.now() - new Date(d).getTime()) / 86400000);
  if (diff === 0) return 'today';
  if (diff === 1) return 'yesterday';
  if (diff < 7) return `${diff} days ago`;
  if (diff < 30) return `${Math.round(diff / 7)} weeks ago`;
  return fmt(d);
}

function fmtNext(d: Date | null | undefined) {
  if (!d) return null;
  const diff = Math.round((new Date(d).getTime() - Date.now()) / 86400000);
  if (diff <= 0) return 'overdue';
  if (diff === 1) return 'tomorrow';
  if (diff < 7) return `in ${diff} days`;
  if (diff < 30) return `in ${Math.round(diff / 7)} weeks`;
  return fmt(d);
}

const OUTCOME_CONFIG: Record<string, {
  icon: string;
  label: string;
  subtext: string;
  bg: string;
  border: string;
  color: string;
}> = {
  Passed: {
    icon: '✅',
    label: 'This bill passed parliament',
    subtext: 'Royal Assent granted — this bill is now law.',
    bg: 'rgba(46,139,87,0.10)',
    border: 'rgba(46,139,87,0.35)',
    color: '#2E8B57',
  },
  'Assented': {
    icon: '✅',
    label: 'This bill passed parliament',
    subtext: 'Royal Assent granted — this bill is now law.',
    bg: 'rgba(46,139,87,0.10)',
    border: 'rgba(46,139,87,0.35)',
    color: '#2E8B57',
  },
  'Not Passed': {
    icon: '❌',
    label: 'This bill did not pass parliament',
    subtext: 'The bill was rejected or lapsed before becoming law.',
    bg: 'rgba(185,28,28,0.10)',
    border: 'rgba(185,28,28,0.30)',
    color: '#f87171',
  },
  'Lapsed': {
    icon: '⏹',
    label: 'This bill lapsed at dissolution of parliament',
    subtext: 'Parliament was dissolved before this bill could be voted on. It would need to be reintroduced in a new parliament.',
    bg: 'rgba(100,116,139,0.10)',
    border: 'rgba(100,116,139,0.30)',
    color: '#94a3b8',
  },
};

export default async function BillPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const bill = await prisma.bill.findUnique({
    where: { id },
    include: { stages: { orderBy: { recordedAt: 'desc' } } },
  });

  if (!bill) notFound();

  const b = bill as any;
  const isLapsed = bill.status === 'Before Parliament' && b.parliamentNumber && b.parliamentNumber < 48;
  const isClosed = bill.status !== 'Before Parliament' || isLapsed;
  const outcomeConfig = b.outcome
    ? (OUTCOME_CONFIG[b.outcome] ?? OUTCOME_CONFIG[bill.status])
    : isLapsed
    ? OUTCOME_CONFIG['Lapsed']
    : isClosed
    ? OUTCOME_CONFIG['Not Passed']
    : null;

  const results = await getBillResults(bill.id);
  const supportPct = results.total > 0 ? Math.round((results.support / results.total) * 100) : 0;
  const opposePct = results.total > 0 ? Math.round((results.oppose / results.total) * 100) : 0;
  const abstainPct = results.total > 0 ? Math.round((results.abstain / results.total) * 100) : 0;

  // Majority sentiment for comparison callout
  const majorityPosition = results.total > 0
    ? (results.support >= results.oppose && results.support >= results.abstain ? 'supported'
      : results.oppose >= results.support && results.oppose >= results.abstain ? 'opposed'
      : 'abstained from')
    : null;

  const session = await auth();
  let userVote = null;
  if (session?.user) {
    const existingVote = await prisma.vote.findUnique({
      where: { userId_billId: { userId: (session.user as any).id, billId: bill.id } },
    });
    userVote = existingVote?.position || null;
  }

  const chamberLabel = bill.chamber === 'HOUSE' ? '🏛 House of Representatives'
    : bill.chamber === 'SENATE' ? '🔱 Senate' : '⚖️ Joint';

  return (
    <main style={{ backgroundColor: '#0B1220', minHeight: '100vh', color: '#F5F7FB' }}>
      <Nav />
      <div className='page-container'>
        <Link href="/bills" style={{ color: '#2E8B57', fontSize: '13px', textDecoration: 'none', display: 'block', marginBottom: '24px' }}>
          ← Back to bills
        </Link>

        {/* ── Outcome banner (only for decided bills) ── */}
        {outcomeConfig && (
          <div style={{
            backgroundColor: outcomeConfig.bg,
            border: `1px solid ${outcomeConfig.border}`,
            borderRadius: '12px',
            padding: '20px 24px',
            marginBottom: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>{outcomeConfig.icon}</span>
              <span style={{ fontSize: '16px', fontWeight: 700, color: outcomeConfig.color }}>
                {outcomeConfig.label}
              </span>
              {b.outcomeDate && (
                <span style={{ fontSize: '12px', color: '#7E8AA3', marginLeft: 'auto' }}>
                  {fmt(b.outcomeDate)}
                </span>
              )}
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: '#B6C0D1', paddingLeft: '30px' }}>
              {outcomeConfig.subtext}
            </p>

            {/* Constituent sentiment vs outcome */}
            {results.total > 0 && majorityPosition && (
              <div style={{
                marginTop: '10px',
                paddingTop: '14px',
                borderTop: `1px solid ${outcomeConfig.border}`,
                paddingLeft: '30px',
              }}>
                {b.outcome === 'Assented' && majorityPosition === 'opposed' && (
                  <p style={{ margin: 0, fontSize: '13px', color: '#f87171' }}>
                    ⚠️ <strong>{opposePct}% of voters opposed this bill</strong> — parliament passed it anyway.
                  </p>
                )}
                {b.outcome === 'Assented' && majorityPosition === 'supported' && (
                  <p style={{ margin: 0, fontSize: '13px', color: '#2E8B57' }}>
                    ✓ <strong>{supportPct}% of voters supported this bill</strong> — parliament agreed.
                  </p>
                )}
                {b.outcome === 'Not Passed' && majorityPosition === 'supported' && (
                  <p style={{ margin: 0, fontSize: '13px', color: '#f87171' }}>
                    ⚠️ <strong>{supportPct}% of voters supported this bill</strong> — parliament rejected it anyway.
                  </p>
                )}
                {b.outcome === 'Not Passed' && majorityPosition === 'opposed' && (
                  <p style={{ margin: 0, fontSize: '13px', color: '#2E8B57' }}>
                    ✓ <strong>{opposePct}% of voters opposed this bill</strong> — parliament agreed.
                  </p>
                )}
                {majorityPosition === 'abstained from' && (
                  <p style={{ margin: 0, fontSize: '13px', color: '#7E8AA3' }}>
                    Most voters abstained on this bill ({abstainPct}%).
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Bill header ── */}
        <div style={{ backgroundColor: '#111A2E', border: '1px solid #25324D', borderRadius: '12px', padding: '28px', marginBottom: '16px' }}>

          {/* Status badges */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
            <span style={{ backgroundColor: '#16213A', color: '#B6C0D1', fontSize: '11px', padding: '3px 10px', borderRadius: '4px' }}>
              {chamberLabel}
            </span>
            {!isClosed && (
              <span style={{ backgroundColor: 'rgba(46,139,87,0.14)', color: '#2E8B57', fontSize: '11px', padding: '3px 10px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#2E8B57', display: 'inline-block' }} />
                {bill.status}
              </span>
            )}
            {bill.portfolio && (
              <span style={{ backgroundColor: 'rgba(214,169,74,0.14)', color: '#D6A94A', fontSize: '11px', padding: '3px 10px', borderRadius: '4px' }}>
                {bill.portfolio}
              </span>
            )}
            {b.revisionsCount > 1 && (
              <span style={{ backgroundColor: 'rgba(100,120,200,0.14)', color: '#7B93D4', fontSize: '11px', padding: '3px 10px', borderRadius: '4px' }}>
                {b.revisionsCount} readings
              </span>
            )}
            {b.hasAmendments && (
              <span style={{ backgroundColor: 'rgba(180,100,50,0.14)', color: '#C97B4B', fontSize: '11px', padding: '3px 10px', borderRadius: '4px' }}>
                Amendments circulated
              </span>
            )}
          </div>

          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#F5F7FB', marginBottom: '20px', lineHeight: 1.35 }}>
            {bill.title}
          </h1>

          {/* AI plain-English breakdown */}
          {b.aiSummary && (
            <div style={{
              backgroundColor: 'rgba(46,139,87,0.07)',
              border: '1px solid rgba(46,139,87,0.2)',
              borderRadius: '8px',
              padding: '18px',
              marginBottom: '18px',
            }}>
              <p style={{ fontSize: '11px', fontWeight: 700, color: '#2E8B57', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                ✦ Plain-English Summary
              </p>
              <div style={{ color: '#C8D4E8', lineHeight: 1.75, fontSize: '14px', whiteSpace: 'pre-wrap' }}>
                {b.aiSummary}
              </div>
            </div>
          )}

          {/* Official description */}
          {b.aphDescription && (
            <div style={{ marginBottom: '16px' }}>
              <p style={{ fontSize: '10px', fontWeight: 600, color: '#3A4A6A', margin: '0 0 5px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                Official Description
              </p>
              <p style={{ color: '#7E8AA3', lineHeight: 1.65, margin: 0, fontSize: '13px' }}>
                {b.aphDescription}
              </p>
            </div>
          )}

          {/* Committee referrals */}
          {b.committees && (
            <div style={{ marginBottom: '16px' }}>
              <p style={{ fontSize: '10px', fontWeight: 600, color: '#3A4A6A', margin: '0 0 5px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                Committee Referrals
              </p>
              <p style={{ color: '#7E8AA3', fontSize: '13px', margin: 0 }}>{b.committees}</p>
            </div>
          )}

          {/* Sponsor + links */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', paddingTop: '16px', borderTop: '1px solid #1C2940' }}>
            {bill.sponsorName && (
              <p style={{ fontSize: '13px', color: '#7E8AA3', margin: 0 }}>
                Introduced by <strong style={{ color: '#B6C0D1' }}>{bill.sponsorName}</strong>
              </p>
            )}
            <div style={{ display: 'flex', gap: '14px', marginLeft: 'auto' }}>
              {b.pdfUrl && (
                <a href={b.pdfUrl} target="_blank" rel="noopener noreferrer"
                  style={{ color: '#7B93D4', fontSize: '13px', textDecoration: 'none' }}>
                  Full bill PDF →
                </a>
              )}
              {bill.aphUrl && (
                <a href={bill.aphUrl} target="_blank" rel="noopener noreferrer"
                  style={{ color: '#2E8B57', fontSize: '13px', textDecoration: 'none' }}>
                  APH page →
                </a>
              )}
            </div>
          </div>
        </div>

        {/* ── Audit trail ── */}
        <div style={{ backgroundColor: '#0E1628', border: '1px solid #1C2940', borderRadius: '10px', padding: '16px 20px', marginBottom: '16px' }}>
          <p style={{ fontSize: '10px', fontWeight: 600, color: '#3A4A6A', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Audit History
          </p>
          <div className='audit-row'>
            {b.introducedAt && (
              <div>
                <p style={{ fontSize: '10px', color: '#3A4A6A', margin: '0 0 2px' }}>Introduced</p>
                <p style={{ fontSize: '13px', color: '#7E8AA3', margin: 0 }}>{fmt(b.introducedAt)}</p>
              </div>
            )}
            {bill.lastUpdatedAt && (
              <div>
                <p style={{ fontSize: '10px', color: '#3A4A6A', margin: '0 0 2px' }}>Last updated on APH</p>
                <p style={{ fontSize: '13px', color: '#7E8AA3', margin: 0 }}>{fmt(bill.lastUpdatedAt)}</p>
              </div>
            )}
            {b.outcomeDate && (
              <div>
                <p style={{ fontSize: '10px', color: '#3A4A6A', margin: '0 0 2px' }}>Outcome date</p>
                <p style={{ fontSize: '13px', color: '#B6C0D1', margin: 0, fontWeight: 500 }}>{fmt(b.outcomeDate)}</p>
              </div>
            )}
            {b.lastCheckedAt && (
              <div>
                <p style={{ fontSize: '10px', color: '#3A4A6A', margin: '0 0 2px' }}>Last checked by Crossbench</p>
                <p style={{ fontSize: '13px', color: '#B6C0D1', margin: 0 }}>{fmtRel(b.lastCheckedAt)}</p>
              </div>
            )}
            {b.nextReviewAt && !isClosed && (
              <div>
                <p style={{ fontSize: '10px', color: '#3A4A6A', margin: '0 0 2px' }}>Next review</p>
                <p style={{ fontSize: '13px', color: fmtNext(b.nextReviewAt) === 'overdue' ? '#D95C4B' : '#2E8B57', margin: 0, fontWeight: 500 }}>
                  {fmtNext(b.nextReviewAt)}
                </p>
              </div>
            )}
            {b.fullTextFetchedAt && (
              <div>
                <p style={{ fontSize: '10px', color: '#3A4A6A', margin: '0 0 2px' }}>Full text indexed</p>
                <p style={{ fontSize: '13px', color: '#7E8AA3', margin: 0 }}>{fmtRel(b.fullTextFetchedAt)}</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Parliamentary Progress ── */}
        {(() => {
          const progress: Array<{chamber: string; event: string; date: string | null}> = b.parliamentaryProgress
            ? JSON.parse(b.parliamentaryProgress)
            : [];
          const mainStages = progress.filter((s: any) =>
            /agreed to|negatived|passed both|withdrawn|lapsed|assent|Committee of the Whole|Consideration of Senate message|Referred to Committee|Committee report/i.test(s.event)
          );
          if (mainStages.length === 0) return null;

          const CHAMBERS = ['House of Representatives', 'Senate', 'Both Houses'];
          const grouped: Record<string, typeof mainStages> = {};
          for (const c of CHAMBERS) grouped[c] = [];
          for (const s of mainStages) {
            if (grouped[s.chamber]) grouped[s.chamber].push(s);
          }

          const chamberIcon: Record<string, string> = {
            'House of Representatives': '🏛',
            'Senate': '🔱',
            'Both Houses': '⚖️',
          };

          const eventColor = (event: string) => {
            if (/agreed to|passed both/i.test(event)) return '#2E8B57';
            if (/negatived|withdrawn|lapsed/i.test(event)) return '#D95C4B';
            return '#B6C0D1';
          };

          const activeChambers = CHAMBERS.filter(c => grouped[c]?.length > 0);

          return (
            <div style={{ backgroundColor: '#0E1628', border: '1px solid #1C2940', borderRadius: '10px', padding: '20px 24px', marginBottom: '16px' }}>
              <p style={{ fontSize: '10px', fontWeight: 600, color: '#3A4A6A', margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                How Parliament Voted
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${activeChambers.length}, 1fr)`, gap: '20px' }}>
                {activeChambers.map(chamber => (
                  <div key={chamber}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#7E8AA3', marginBottom: '10px' }}>
                      {chamberIcon[chamber]} {chamber}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {grouped[chamber].map((s: any, i: number) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                          <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: eventColor(s.event), flexShrink: 0, marginTop: '4px' }} />
                          <div>
                            <div style={{ fontSize: '13px', color: eventColor(s.event), fontWeight: 500 }}>{s.event}</div>
                            {s.date && <div style={{ fontSize: '11px', color: '#4E5A73', marginTop: '2px' }}>{s.date}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* ── How MPs voted (Divisions) ── */}
        {(() => {
          type Division = {
            id: number; house: string; name: string; date: string;
            ayes: number; noes: number; passed: boolean;
            byParty: Array<{ party: string; ayes: number; noes: number }>;
            memberVotes: Array<{ name: string; electorate: string; party: string; vote: string }>;
          };
          const divisions: Division[] = b.divisionsData ? JSON.parse(b.divisionsData) : [];

          // Final reading divisions: passage votes only
          const finalDivisions = divisions.filter(d =>
            /third reading|be read a third|be now read a third/i.test(d.name)
          );
          // Second reading (substantive agreement votes)
          const secondReadingDivisions = divisions.filter(d =>
            /second reading.*agreed|second reading.*agreement|be read a second time/i.test(d.name)
          );
          // Amendment/committee/procedural votes (not passage)
          const amendmentDivisions = divisions.filter(d =>
            /in committee|consideration in detail|committee of the whole|second reading - |reference to committee/i.test(d.name)
          );

          // Priority: third reading > second reading > nothing (don't show amendment-only noise)
          const finalVotes = finalDivisions.length > 0 ? finalDivisions
            : secondReadingDivisions.length > 0 ? secondReadingDivisions
            : [];

          // Only show passage votes — hide amendment-only noise entirely
          const shown = finalVotes.slice(0, 6);
          if (shown.length === 0) {
            // For passed/not-passed bills, explain the voice vote
            if (b.status === 'Passed' || b.status === 'Not Passed') {
              return (
                <div style={{ backgroundColor: '#0E1628', border: '1px solid #1C2940', borderRadius: '10px', padding: '16px 20px', marginBottom: '16px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <span style={{ fontSize: '16px', flexShrink: 0 }}>🗳️</span>
                  <div>
                    <p style={{ fontSize: '12px', fontWeight: 600, color: '#7E8AA3', margin: '0 0 3px' }}>No formal division recorded</p>
                    <p style={{ fontSize: '12px', color: '#4E5A73', margin: 0, lineHeight: '1.5' }}>
                      This bill {b.status === 'Passed' ? 'passed' : 'was voted down'} by voice vote — parliament agreed without calling a formal count.
                      A division is only recorded when a member explicitly requests one.
                    </p>
                  </div>
                </div>
              );
            }
            return null;
          }
          const isAmendmentOnly = false;

          const partyColour = (party: string): string => {
            const p = party.toLowerCase();
            if (p.includes('labor') || p.includes('labour')) return '#E53935';
            if (p.includes('liberal') && !p.includes('national')) return '#1565C0';
            if (p.includes('national')) return '#2E7D32';
            if (p.includes('green')) return '#43A047';
            if (p.includes('teal') || p.includes('independent') || p.includes('crossbench')) return '#00ACC1';
            if (p.includes('one nation')) return '#F57C00';
            if (p.includes('katter')) return '#6D4C41';
            return '#7E8AA3';
          };

          const houseLabel = (h: string) => h === 'representatives' ? 'House' : 'Senate';

          return (
            <div style={{ backgroundColor: '#0E1628', border: '1px solid #1C2940', borderRadius: '10px', padding: '20px 24px', marginBottom: '16px' }}>
              <p style={{ fontSize: '10px', fontWeight: 600, color: '#3A4A6A', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                How Parliament Voted
              </p>
              {isAmendmentOnly && (
                <p style={{ fontSize: '11px', color: '#4E5A73', margin: '0 0 14px', lineHeight: '1.5' }}>
                  This bill passed by voice vote — no formal division on final passage. Votes below are on amendments proposed during debate.
                </p>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {shown.map(div => (
                  <div key={`${div.id}-${div.house}`}>
                    {/* Header row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 7px', borderRadius: '3px', backgroundColor: '#1C2940', color: '#7E8AA3', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {houseLabel(div.house)}
                          </span>
                          <span style={{ fontSize: '11px', color: '#4E5A73' }}>
                            {new Date(div.date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#8A96B0', lineHeight: '1.4' }}>
                          {div.name.replace(/^Bills? — /, '').replace(/^Business — /, '')}
                        </div>
                      </div>
                      {/* Vote counts */}
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexShrink: 0 }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '22px', fontWeight: 700, color: '#2E8B57', lineHeight: 1 }}>{div.ayes}</div>
                          <div style={{ fontSize: '9px', color: '#2E8B57', fontWeight: 600, letterSpacing: '0.05em' }}>AYES</div>
                        </div>
                        <div style={{ fontSize: '14px', color: '#3A4A6A' }}>–</div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '22px', fontWeight: 700, color: '#D95C4B', lineHeight: 1 }}>{div.noes}</div>
                          <div style={{ fontSize: '9px', color: '#D95C4B', fontWeight: 600, letterSpacing: '0.05em' }}>NOES</div>
                        </div>
                        <span style={{
                          fontSize: '11px', fontWeight: 700, padding: '3px 9px', borderRadius: '4px', marginLeft: '4px',
                          backgroundColor: div.passed ? 'rgba(46,139,87,0.18)' : 'rgba(217,92,75,0.18)',
                          color: div.passed ? '#2E8B57' : '#D95C4B', border: `1px solid ${div.passed ? 'rgba(46,139,87,0.3)' : 'rgba(217,92,75,0.3)'}`,
                        }}>
                          {div.passed ? 'PASSED' : 'FAILED'}
                        </span>
                      </div>
                    </div>
                    {/* Party breakdown */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                      {div.byParty.map(p => (
                        <div key={p.party} style={{
                          backgroundColor: '#0A1020', border: '1px solid #1C2940',
                          borderRadius: '5px', padding: '4px 9px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '5px',
                        }}>
                          <span style={{ color: partyColour(p.party), fontSize: '8px' }}>●</span>
                          <span style={{ color: '#8A96B0' }}>{p.party}</span>
                          {p.ayes > 0 && <span style={{ color: '#2E8B57', fontWeight: 600 }}>{p.ayes}✓</span>}
                          {p.noes > 0 && <span style={{ color: '#D95C4B', fontWeight: 600 }}>{p.noes}✗</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {finalVotes.length > 6 && (
                <p style={{ fontSize: '11px', color: '#4E5A73', marginTop: '12px', marginBottom: 0 }}>
                  + {finalVotes.length - 6} more division{finalVotes.length - 6 !== 1 ? 's' : ''} on this bill
                </p>
              )}
            </div>
          );
        })()}

        {/* ── Vote results ── */}
        <div style={{ backgroundColor: '#111A2E', border: '1px solid #25324D', borderRadius: '12px', padding: '28px', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#F5F7FB', marginBottom: '4px' }}>
            Constituent votes
            {results.total > 0 && (
              <span style={{ color: '#7E8AA3', fontWeight: 400, fontSize: '14px', marginLeft: '8px' }}>
                ({results.total.toLocaleString()} total)
              </span>
            )}
          </h2>
          {isClosed && (
            <p style={{ fontSize: '12px', color: '#7E8AA3', marginBottom: '20px', marginTop: '4px' }}>
              Voting is closed — this bill has been decided by parliament.
            </p>
          )}
          {!isClosed && <div style={{ marginBottom: '20px' }} />}

          {results.total === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#7E8AA3' }}>
              <p style={{ fontSize: '16px', marginBottom: '4px' }}>No votes yet.</p>
              <p style={{ fontSize: '13px' }}>{isClosed ? 'No votes were recorded for this bill.' : 'Be the first to vote on this bill.'}</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
              {[
                { label: 'Support', pct: supportPct, count: results.support, color: '#2E8B57' },
                { label: 'Oppose', pct: opposePct, count: results.oppose, color: '#D95C4B' },
                { label: 'Abstain', pct: abstainPct, count: results.abstain, color: '#6F7D95' },
              ].map(({ label, pct, count, color }) => (
                <div key={label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color }}>{label}</span>
                    <span style={{ fontSize: '13px', color: '#7E8AA3' }}>{count.toLocaleString()} ({pct}%)</span>
                  </div>
                  <div style={{ height: '8px', backgroundColor: '#16213A', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', backgroundColor: color, borderRadius: '4px', width: `${pct}%`, transition: 'width 0.3s' }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Voting CTA — locked when bill is decided */}
          <div style={{ borderTop: '1px solid #25324D', paddingTop: '20px' }}>
            {isClosed ? (
              <div style={{
                backgroundColor: '#0E1628',
                border: '1px solid #1C2940',
                borderRadius: '8px',
                padding: '16px',
                textAlign: 'center',
                color: '#4E5A73',
                fontSize: '13px',
              }}>
                🔒 Voting closed — this bill has been decided by parliament
              </div>
            ) : session?.user ? (
              <VoteButton
                billId={bill.id}
                currentVote={userVote as any}
                isVerified={!!(session.user as any).verifiedAt}
              />
            ) : (
              <Link href={`/login?next=/bills/${bill.id}`} style={{
                display: 'block', textAlign: 'center', backgroundColor: '#2E8B57',
                color: '#fff', padding: '14px', borderRadius: '8px', fontWeight: 600,
                fontSize: '15px', textDecoration: 'none'
              }}>
                Sign in to cast your vote
              </Link>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
