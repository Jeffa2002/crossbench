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

export default async function BillPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const bill = await prisma.bill.findUnique({
    where: { id },
    include: { stages: { orderBy: { recordedAt: 'desc' } } },
  });

  if (!bill) notFound();

  const results = await getBillResults(bill.id);
  const supportPct = results.total > 0 ? Math.round((results.support / results.total) * 100) : 0;
  const opposePct = results.total > 0 ? Math.round((results.oppose / results.total) * 100) : 0;
  const abstainPct = results.total > 0 ? Math.round((results.abstain / results.total) * 100) : 0;

  const session = await auth();
  let userVote = null;
  if (session?.user) {
    const existingVote = await prisma.vote.findUnique({
      where: { userId_billId: { userId: (session.user as any).id, billId: bill.id } },
    });
    userVote = existingVote?.position || null;
  }

  const b = bill as any;

  return (
    <main style={{ backgroundColor: '#0B1220', minHeight: '100vh', color: '#F5F7FB' }}>
      <Nav />
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 24px' }}>
        <Link href="/bills" style={{ color: '#2E8B57', fontSize: '13px', textDecoration: 'none', display: 'block', marginBottom: '24px' }}>
          ← Back to bills
        </Link>

        {/* Bill header */}
        <div style={{ backgroundColor: '#111A2E', border: '1px solid #25324D', borderRadius: '12px', padding: '28px', marginBottom: '16px' }}>
          {/* Tags row */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
            <span style={{ backgroundColor: '#16213A', color: '#B6C0D1', fontSize: '11px', padding: '3px 10px', borderRadius: '4px' }}>
              {bill.chamber === 'HOUSE' ? '🏛 House of Reps' : bill.chamber === 'SENATE' ? '🔱 Senate' : '⚖️ Joint'}
            </span>
            <span style={{ backgroundColor: 'rgba(46,139,87,0.14)', color: '#2E8B57', fontSize: '11px', padding: '3px 10px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#2E8B57', display: 'inline-block' }} />
              {bill.status}
            </span>
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

          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#F5F7FB', marginBottom: '16px', lineHeight: 1.3 }}>
            {bill.title}
          </h1>

          {/* AI Summary */}
          {b.aiSummary && (
            <div style={{
              backgroundColor: 'rgba(46,139,87,0.07)', border: '1px solid rgba(46,139,87,0.2)',
              borderRadius: '8px', padding: '16px', marginBottom: '16px'
            }}>
              <p style={{ fontSize: '11px', fontWeight: 700, color: '#2E8B57', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                ✦ Plain-English Summary
              </p>
              <p style={{ color: '#C8D4E8', lineHeight: 1.7, margin: 0, fontSize: '15px' }}>
                {b.aiSummary}
              </p>
            </div>
          )}

          {/* Official APH description */}
          {b.aphDescription && (
            <div style={{ marginBottom: '14px' }}>
              <p style={{ fontSize: '11px', color: '#4A5568', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Official description
              </p>
              <p style={{ color: '#7E8AA3', lineHeight: 1.65, margin: 0, fontSize: '13px' }}>
                {b.aphDescription}
              </p>
            </div>
          )}

          {/* Committee referrals */}
          {b.committees && (
            <div style={{ marginBottom: '14px' }}>
              <p style={{ fontSize: '11px', color: '#4A5568', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Committee referrals
              </p>
              <p style={{ color: '#7E8AA3', fontSize: '13px', margin: 0 }}>{b.committees}</p>
            </div>
          )}

          {/* Sponsor + APH link */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginTop: '14px' }}>
            {bill.sponsorName && (
              <p style={{ fontSize: '13px', color: '#7E8AA3', margin: 0 }}>
                Introduced by <strong style={{ color: '#B6C0D1' }}>{bill.sponsorName}</strong>
              </p>
            )}
            {bill.aphUrl && (
              <a href={bill.aphUrl} target="_blank" rel="noopener noreferrer"
                style={{ color: '#2E8B57', fontSize: '13px', textDecoration: 'none', marginLeft: 'auto' }}>
                Full details on APH →
              </a>
            )}
          </div>
        </div>

        {/* Vote results */}
        <div style={{ backgroundColor: '#111A2E', border: '1px solid #25324D', borderRadius: '12px', padding: '28px', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#F5F7FB', marginBottom: '20px' }}>
            Citizen votes
            {results.total > 0 && (
              <span style={{ color: '#7E8AA3', fontWeight: 400, fontSize: '14px', marginLeft: '8px' }}>
                ({results.total.toLocaleString()} total)
              </span>
            )}
          </h2>

          {results.total === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#7E8AA3' }}>
              <p style={{ fontSize: '16px', marginBottom: '4px' }}>No votes yet.</p>
              <p style={{ fontSize: '13px' }}>Be the first to vote on this bill.</p>
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

          <div style={{ borderTop: '1px solid #25324D', paddingTop: '20px' }}>
            {session?.user ? (
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
