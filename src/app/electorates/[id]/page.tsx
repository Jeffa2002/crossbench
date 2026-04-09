import { prisma } from '@/lib/prisma';
import Nav from '@/components/Nav';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';

export const revalidate = 300;

const PARTY_COLORS: Record<string, string> = {
  'Australian Labor Party': '#E53E3E',
  'Liberal Party of Australia': '#3182CE',
  'The Nationals': '#38A169',
  'Australian Greens': '#48BB78',
  'Independent': '#805AD5',
  'Centre Alliance': '#DD6B20',
  'Katter\'s Australian Party': '#B7791F',
  'United Australia Party': '#D69E2E',
  'One Nation': '#F6AD55',
  'Teal Independent': '#319795',
};

function getPartyColor(party: string | null) {
  if (!party) return '#6F7D95';
  for (const [key, color] of Object.entries(PARTY_COLORS)) {
    if (party.toLowerCase().includes(key.toLowerCase().split(' ')[0].toLowerCase())) return color;
  }
  return '#6F7D95';
}

export default async function ElectoratePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const electorate = await prisma.electorate.findUnique({
    where: { id },
  });

  if (!electorate) notFound();

  const votes = await prisma.vote.groupBy({
    by: ['position'],
    where: { electorateId: id },
    _count: true,
  });

  const total = votes.reduce((sum, v) => sum + v._count, 0);
  const support = votes.find(v => v.position === 'SUPPORT')?._count || 0;
  const oppose = votes.find(v => v.position === 'OPPOSE')?._count || 0;
  const abstain = votes.find(v => v.position === 'ABSTAIN')?._count || 0;
  const supportPct = total > 0 ? Math.round((support / total) * 100) : 0;
  const opposePct = total > 0 ? Math.round((oppose / total) * 100) : 0;
  const abstainPct = total > 0 ? Math.round((abstain / total) * 100) : 0;

  const topBills = await prisma.vote.groupBy({
    by: ['billId'],
    where: { electorateId: id },
    _count: true,
    orderBy: { _count: { billId: 'desc' } },
    take: 5,
  });

  const billIds = topBills.map(b => b.billId);
  const bills = billIds.length > 0 ? await prisma.bill.findMany({
    where: { id: { in: billIds } },
    select: { id: true, title: true, chamber: true, status: true },
  }) : [];

  const partyColor = getPartyColor(electorate.mpParty);
  const chamberLabel = (electorate as any).mpChamber || 'House of Reps';
  const chamberIsHouse = chamberLabel === 'House of Reps';
  const photoUrl = (electorate as any).mpPhotoUrl as string | null;

  return (
    <main style={{ backgroundColor: '#0B1220', minHeight: '100vh', color: '#F5F7FB' }}>
      <Nav />
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 24px' }}>
        <Link href="/electorates" style={{ color: '#2E8B57', fontSize: '13px', textDecoration: 'none', display: 'block', marginBottom: '24px' }}>
          ← All electorates
        </Link>

        {/* Electorate header with MP photo */}
        <div style={{ backgroundColor: '#111A2E', border: '1px solid #25324D', borderRadius: '12px', padding: '28px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px' }}>
            {/* MP Photo */}
            {photoUrl && (
              <div style={{
                width: '88px', height: '108px', borderRadius: '8px', overflow: 'hidden',
                border: '2px solid #25324D', flexShrink: 0, backgroundColor: '#0B1220'
              }}>
                <img
                  src={photoUrl}
                  alt={electorate.mpName || 'MP photo'}
                  width={88}
                  height={108}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
                />
              </div>
            )}

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '8px' }}>
                <div>
                  <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#F5F7FB', margin: 0 }}>
                    Division of {electorate.name}
                  </h1>
                  <p style={{ color: '#7E8AA3', margin: '4px 0 0', fontSize: '14px' }}>{electorate.state}</p>
                </div>
                {/* Chamber badge */}
                <span style={{
                  backgroundColor: chamberIsHouse ? 'rgba(49,130,206,0.15)' : 'rgba(130,80,200,0.15)',
                  color: chamberIsHouse ? '#63B3ED' : '#B794F4',
                  fontSize: '11px', padding: '4px 10px', borderRadius: '20px',
                  fontWeight: 600, flexShrink: 0, border: `1px solid ${chamberIsHouse ? 'rgba(49,130,206,0.3)' : 'rgba(130,80,200,0.3)'}`
                }}>
                  {chamberIsHouse ? '🏛 House of Reps' : '🔱 Senate'}
                </span>
              </div>

              {electorate.mpName && (
                <div style={{ marginTop: '12px' }}>
                  <p style={{ fontSize: '12px', color: '#7E8AA3', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {chamberIsHouse ? 'Member for' : 'Senator for'} {electorate.name}
                  </p>
                  <p style={{ fontWeight: 700, color: '#F5F7FB', margin: 0, fontSize: '18px' }}>{electorate.mpName}</p>
                  {electorate.mpParty && (
                    <span style={{
                      display: 'inline-block', marginTop: '6px',
                      backgroundColor: `${partyColor}22`, color: partyColor,
                      fontSize: '12px', padding: '2px 10px', borderRadius: '20px',
                      fontWeight: 600, border: `1px solid ${partyColor}44`
                    }}>
                      {electorate.mpParty}
                    </span>
                  )}
                  {electorate.mpEmail && (
                    <a href={`mailto:${electorate.mpEmail}`} style={{
                      color: '#2E8B57', fontSize: '13px', textDecoration: 'none',
                      display: 'block', marginTop: '8px'
                    }}>
                      ✉ {electorate.mpEmail}
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Vote breakdown */}
        <div style={{ backgroundColor: '#111A2E', border: '1px solid #25324D', borderRadius: '12px', padding: '28px', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#F5F7FB', marginBottom: '20px' }}>
            How {electorate.name} is voting
            {total > 0 && (
              <span style={{ color: '#7E8AA3', fontWeight: 400, fontSize: '14px', marginLeft: '8px' }}>
                ({total} votes across all bills)
              </span>
            )}
          </h2>
          {total === 0 ? (
            <p style={{ color: '#7E8AA3', fontSize: '14px', margin: 0 }}>
              No votes yet from this electorate.{' '}
              <Link href="/bills" style={{ color: '#2E8B57', textDecoration: 'none' }}>Be the first →</Link>
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {[
                { label: 'Support', pct: supportPct, count: support, color: '#2E8B57' },
                { label: 'Oppose', pct: opposePct, count: oppose, color: '#D95C4B' },
                { label: 'Abstain', pct: abstainPct, count: abstain, color: '#6F7D95' },
              ].map(({ label, pct, count, color }) => (
                <div key={label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color }}>{label}</span>
                    <span style={{ fontSize: '13px', color: '#7E8AA3' }}>{count} ({pct}%)</span>
                  </div>
                  <div style={{ height: '8px', backgroundColor: '#16213A', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', backgroundColor: color, borderRadius: '4px', width: `${pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top bills */}
        {bills.length > 0 && (
          <div style={{ backgroundColor: '#111A2E', border: '1px solid #25324D', borderRadius: '12px', padding: '28px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#F5F7FB', marginBottom: '16px' }}>
              Most voted bills in {electorate.name}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {bills.map(bill => (
                <Link key={bill.id} href={`/bills/${bill.id}`} style={{
                  display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px 16px',
                  borderRadius: '8px', border: '1px solid #25324D', textDecoration: 'none'
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '14px', fontWeight: 500, color: '#F5F7FB', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {bill.title}
                    </p>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                      <span style={{ fontSize: '11px', backgroundColor: '#16213A', color: '#B6C0D1', padding: '2px 8px', borderRadius: '4px' }}>{bill.chamber}</span>
                      <span style={{ fontSize: '11px', color: '#7E8AA3' }}>{bill.status}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
