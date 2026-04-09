import { prisma } from '@/lib/prisma';
import Nav from '@/components/Nav';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export const revalidate = 60;

const PARTY_COLORS: Record<string, string> = {
  'labor': '#E53E3E',
  'liberal': '#3182CE',
  'national': '#38A169',
  'greens': '#48BB78',
  'independent': '#805AD5',
  'teal': '#319795',
  'one nation': '#F6AD55',
  'united australia': '#D69E2E',
  'katter': '#B7791F',
};

function getPartyColor(party: string | null) {
  if (!party) return '#6F7D95';
  const p = party.toLowerCase();
  for (const [key, color] of Object.entries(PARTY_COLORS)) {
    if (p.includes(key)) return color;
  }
  return '#6F7D95';
}

function fmt(d: Date | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

const POSITION_LABEL: Record<string, string> = {
  SUPPORT: 'Supported',
  OPPOSE: 'Opposed',
  ABSTAIN: 'Abstained',
};

const POSITION_COLOR: Record<string, string> = {
  SUPPORT: '#2E8B57',
  OPPOSE: '#D95C4B',
  ABSTAIN: '#6F7D95',
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect('/login?next=/dashboard');

  const userId = (session.user as any).id;

  // Load user with electorate
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { electorate: true },
  });

  if (!user) redirect('/login');

  const electorate = user.electorate as any;
  const isVerified = !!user.verifiedAt;

  // User's vote history
  const myVotes = await prisma.vote.findMany({
    where: { userId },
    include: {
      bill: {
        select: { id: true, title: true, chamber: true, status: true, aiSummary: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Per-bill national stats for bills the user voted on
  const votedBillIds = myVotes.map(v => v.billId);
  const nationalStats = votedBillIds.length > 0
    ? await prisma.vote.groupBy({
        by: ['billId', 'position'],
        where: { billId: { in: votedBillIds } },
        _count: true,
      })
    : [];

  // Electorate stats for bills the user voted on (if verified)
  const electorateStats = (votedBillIds.length > 0 && electorate)
    ? await prisma.vote.groupBy({
        by: ['billId', 'position'],
        where: { billId: { in: votedBillIds }, electorateId: electorate.id },
        _count: true,
      })
    : [];

  // Most active bills nationally (top 5 not yet voted by user)
  const popularBills = await prisma.vote.groupBy({
    by: ['billId'],
    where: { billId: { notIn: votedBillIds } },
    _count: true,
    orderBy: { _count: { billId: 'desc' } },
    take: 5,
  });
  const popularBillDetails = popularBills.length > 0
    ? await prisma.bill.findMany({
        where: { id: { in: popularBills.map(b => b.billId) } },
        select: { id: true, title: true, chamber: true, status: true },
      })
    : [];

  const partyColor = electorate ? getPartyColor(electorate.mpParty) : '#6F7D95';

  // Helper: get national pct for a bill+position
  function nationalPct(billId: string, position: string) {
    const rows = nationalStats.filter(r => r.billId === billId);
    const total = rows.reduce((s, r) => s + r._count, 0);
    const count = rows.find(r => r.position === position)?._count || 0;
    return total > 0 ? Math.round((count / total) * 100) : 0;
  }

  // Helper: get electorate pct for a bill+position
  function electPct(billId: string, position: string) {
    const rows = electorateStats.filter(r => r.billId === billId);
    const total = rows.reduce((s, r) => s + r._count, 0);
    const count = rows.find(r => r.position === position)?._count || 0;
    return total > 0 ? Math.round((count / total) * 100) : 0;
  }

  return (
    <main style={{ backgroundColor: '#0B1220', minHeight: '100vh', color: '#F5F7FB' }}>
      <Nav />
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 24px' }}>

        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#F5F7FB', margin: '0 0 6px' }}>
            {user.name ? `G'day, ${user.name.split(' ')[0]}` : 'Your Dashboard'}
          </h1>
          <p style={{ color: '#7E8AA3', margin: 0, fontSize: '14px' }}>
            {myVotes.length === 0 ? 'You haven\'t voted on any bills yet.' : `You've voted on ${myVotes.length} bill${myVotes.length !== 1 ? 's' : ''}.`}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '16px', alignItems: 'start' }}>

          {/* Left column: electorate + MP card */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Electorate / verification card */}
            {!isVerified ? (
              <div style={{ backgroundColor: '#111A2E', border: '1px solid rgba(214,169,74,0.3)', borderRadius: '12px', padding: '24px' }}>
                <p style={{ fontSize: '12px', color: '#D6A94A', margin: '0 0 8px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em' }}>
                  ⚠ Address not verified
                </p>
                <p style={{ color: '#B6C0D1', fontSize: '14px', lineHeight: 1.6, margin: '0 0 16px' }}>
                  Verify your address to link your votes to your electorate and see how your community compares to the rest of Australia.
                </p>
                <Link href="/account" style={{
                  display: 'block', textAlign: 'center', backgroundColor: '#D6A94A',
                  color: '#0B1220', padding: '10px', borderRadius: '8px',
                  fontWeight: 700, fontSize: '14px', textDecoration: 'none'
                }}>
                  Verify my address →
                </Link>
              </div>
            ) : electorate ? (
              <div style={{ backgroundColor: '#111A2E', border: '1px solid #25324D', borderRadius: '12px', padding: '24px' }}>
                <p style={{ fontSize: '10px', color: '#3A4A6A', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>
                  Your Electorate
                </p>
                <Link href={`/electorates/${electorate.id}`} style={{ textDecoration: 'none' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#F5F7FB', margin: '0 0 4px' }}>
                    {electorate.name}
                  </h2>
                  <p style={{ color: '#7E8AA3', fontSize: '13px', margin: '0 0 16px' }}>{electorate.state}</p>
                </Link>

                {/* MP */}
                {electorate.mpName && (
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', paddingTop: '14px', borderTop: '1px solid #1C2940' }}>
                    {electorate.mpPhotoUrl && (
                      <img
                        src={electorate.mpPhotoUrl}
                        alt={electorate.mpName}
                        style={{ width: '52px', height: '64px', borderRadius: '6px', objectFit: 'cover', objectPosition: 'top', border: '1px solid #25324D', flexShrink: 0 }}
                      />
                    )}
                    <div>
                      <p style={{ fontSize: '10px', color: '#3A4A6A', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Your MP</p>
                      <p style={{ fontWeight: 700, color: '#F5F7FB', margin: '0 0 4px', fontSize: '15px' }}>{electorate.mpName}</p>
                      {electorate.mpParty && (
                        <span style={{
                          display: 'inline-block',
                          backgroundColor: `${partyColor}22`, color: partyColor,
                          fontSize: '11px', padding: '2px 8px', borderRadius: '20px',
                          fontWeight: 600, border: `1px solid ${partyColor}44`
                        }}>
                          {electorate.mpParty}
                        </span>
                      )}
                      {electorate.mpId && (
                        <Link href={`/mp/${electorate.mpId}`} style={{ color: '#2E8B57', fontSize: '12px', display: 'block', marginTop: '8px', textDecoration: 'none' }}>
                          View MP profile →
                        </Link>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {/* Quick stats */}
            <div style={{ backgroundColor: '#111A2E', border: '1px solid #25324D', borderRadius: '12px', padding: '20px' }}>
              <p style={{ fontSize: '10px', color: '#3A4A6A', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>
                Your Votes
              </p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {['SUPPORT', 'OPPOSE', 'ABSTAIN'].map(pos => {
                  const count = myVotes.filter(v => v.position === pos).length;
                  return (
                    <div key={pos} style={{ flex: 1, minWidth: '60px', textAlign: 'center', backgroundColor: '#0B1220', borderRadius: '8px', padding: '12px 8px' }}>
                      <p style={{ fontSize: '22px', fontWeight: 700, color: POSITION_COLOR[pos], margin: '0 0 4px' }}>{count}</p>
                      <p style={{ fontSize: '10px', color: '#7E8AA3', margin: 0 }}>{POSITION_LABEL[pos]}</p>
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #1C2940' }}>
                <Link href="/bills" style={{ color: '#2E8B57', fontSize: '13px', textDecoration: 'none' }}>
                  Browse more bills →
                </Link>
              </div>
            </div>

          </div>

          {/* Right column: vote history */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {myVotes.length === 0 ? (
              <div style={{ backgroundColor: '#111A2E', border: '1px solid #25324D', borderRadius: '12px', padding: '40px', textAlign: 'center' }}>
                <p style={{ fontSize: '32px', margin: '0 0 12px' }}>🗳</p>
                <p style={{ color: '#B6C0D1', fontWeight: 600, margin: '0 0 8px' }}>No votes yet</p>
                <p style={{ color: '#7E8AA3', fontSize: '14px', margin: '0 0 20px' }}>Start voting on bills to see your history and how you compare to your electorate.</p>
                <Link href="/bills" style={{
                  display: 'inline-block', backgroundColor: '#2E8B57', color: '#fff',
                  padding: '10px 24px', borderRadius: '8px', fontWeight: 600,
                  fontSize: '14px', textDecoration: 'none'
                }}>
                  Browse bills
                </Link>
              </div>
            ) : (
              <>
                <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#F5F7FB', margin: 0 }}>
                  Your vote history
                </h2>
                {myVotes.map(vote => {
                  const pos = vote.position as string;
                  const natPct = nationalPct(vote.billId, pos);
                  const elPct = electPct(vote.billId, pos);
                  const bill = vote.bill as any;
                  return (
                    <div key={vote.id} style={{
                      backgroundColor: '#111A2E', border: '1px solid #25324D',
                      borderRadius: '12px', padding: '20px',
                    }}>
                      {/* Bill title + your vote */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
                        <Link href={`/bills/${vote.billId}`} style={{ textDecoration: 'none', flex: 1 }}>
                          <p style={{ fontSize: '14px', fontWeight: 600, color: '#F5F7FB', margin: '0 0 4px', lineHeight: 1.4 }}>
                            {bill.title}
                          </p>
                          <p style={{ fontSize: '12px', color: '#7E8AA3', margin: 0 }}>{fmt(vote.createdAt)} · {bill.status}</p>
                        </Link>
                        <span style={{
                          flexShrink: 0,
                          backgroundColor: `${POSITION_COLOR[pos]}22`,
                          color: POSITION_COLOR[pos],
                          fontSize: '11px', fontWeight: 700, padding: '4px 10px',
                          borderRadius: '20px', border: `1px solid ${POSITION_COLOR[pos]}44`
                        }}>
                          {POSITION_LABEL[pos]}
                        </span>
                      </div>

                      {/* Comparison bars */}
                      <div style={{ display: 'flex', gap: '12px', fontSize: '12px' }}>
                        {/* National */}
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ color: '#4A5568' }}>🇦🇺 National</span>
                            <span style={{ color: POSITION_COLOR[pos], fontWeight: 600 }}>{natPct}% {pos.toLowerCase()}</span>
                          </div>
                          <div style={{ height: '5px', backgroundColor: '#16213A', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${natPct}%`, backgroundColor: POSITION_COLOR[pos], borderRadius: '3px' }} />
                          </div>
                        </div>

                        {/* Electorate */}
                        {electorate && (
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                              <span style={{ color: '#4A5568' }}>📍 {electorate.name}</span>
                              <span style={{ color: '#7B93D4', fontWeight: 600 }}>{elPct}% {pos.toLowerCase()}</span>
                            </div>
                            <div style={{ height: '5px', backgroundColor: '#16213A', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${elPct}%`, backgroundColor: '#7B93D4', borderRadius: '3px' }} />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            {/* Suggested bills */}
            {popularBillDetails.length > 0 && (
              <div style={{ backgroundColor: '#0E1628', border: '1px solid #1C2940', borderRadius: '12px', padding: '20px' }}>
                <p style={{ fontSize: '11px', color: '#3A4A6A', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>
                  Trending bills — not yet voted
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {popularBillDetails.map(bill => (
                    <Link key={bill.id} href={`/bills/${bill.id}`} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '10px 12px', borderRadius: '8px', border: '1px solid #1C2940',
                      textDecoration: 'none', gap: '12px'
                    }}>
                      <p style={{ fontSize: '13px', color: '#B6C0D1', margin: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {bill.title}
                      </p>
                      <span style={{ fontSize: '11px', color: '#2E8B57', flexShrink: 0 }}>Vote →</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </main>
  );
}
