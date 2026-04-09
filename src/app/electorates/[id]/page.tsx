import { prisma } from '@/lib/prisma';
import Nav from '@/components/Nav';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const revalidate = 300;

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

  return (
    <main style={{ backgroundColor: '#0B1220', minHeight: '100vh', color: '#F5F7FB' }}>
      <Nav />
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 24px' }}>
        <Link href="/electorates" style={{ color: '#2E8B57', fontSize: '13px', textDecoration: 'none', display: 'block', marginBottom: '24px' }}>← All electorates</Link>

        {/* Electorate header */}
        <div style={{ backgroundColor: '#111A2E', border: '1px solid #25324D', borderRadius: '12px', padding: '28px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '16px' }}>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#F5F7FB', margin: 0 }}>{electorate.name}</h1>
              <p style={{ color: '#7E8AA3', margin: '4px 0 0', fontSize: '14px' }}>{electorate.state}</p>
            </div>
            <span style={{ backgroundColor: 'rgba(46,139,87,0.14)', color: '#2E8B57', fontSize: '11px', padding: '4px 12px', borderRadius: '20px', fontWeight: 600, flexShrink: 0 }}>
              Federal electorate
            </span>
          </div>

          {electorate.mpName && (
            <div style={{ borderTop: '1px solid #25324D', paddingTop: '16px' }}>
              <p style={{ fontSize: '12px', color: '#7E8AA3', marginBottom: '4px' }}>Current MP</p>
              <p style={{ fontWeight: 600, color: '#F5F7FB', margin: 0 }}>{electorate.mpName}</p>
              {electorate.mpParty && <p style={{ fontSize: '13px', color: '#B6C0D1', margin: '2px 0 0' }}>{electorate.mpParty}</p>}
              {electorate.mpEmail && (
                <a href={`mailto:${electorate.mpEmail}`} style={{ color: '#2E8B57', fontSize: '13px', textDecoration: 'none', display: 'block', marginTop: '4px' }}>
                  {electorate.mpEmail}
                </a>
              )}
            </div>
          )}
        </div>

        {/* Vote breakdown */}
        <div style={{ backgroundColor: '#111A2E', border: '1px solid #25324D', borderRadius: '12px', padding: '28px', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#F5F7FB', marginBottom: '20px' }}>
            How {electorate.name} is voting
            {total > 0 && <span style={{ color: '#7E8AA3', fontWeight: 400, fontSize: '14px', marginLeft: '8px' }}>({total} votes across all bills)</span>}
          </h2>
          {total === 0 ? (
            <p style={{ color: '#7E8AA3', fontSize: '14px', margin: 0 }}>
              No votes yet from this electorate. <Link href="/bills" style={{ color: '#2E8B57', textDecoration: 'none' }}>Be the first →</Link>
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
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#F5F7FB', marginBottom: '16px' }}>Most voted bills in {electorate.name}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {bills.map(bill => (
                <Link key={bill.id} href={`/bills/${bill.id}`} style={{
                  display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px 16px',
                  borderRadius: '8px', border: '1px solid #25324D', textDecoration: 'none'
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '14px', fontWeight: 500, color: '#F5F7FB', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bill.title}</p>
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
