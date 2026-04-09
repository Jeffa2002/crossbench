import { prisma } from '@/lib/prisma';
import Nav from '@/components/Nav';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const revalidate = 300;

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

export default async function ElectoratePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const electorate = await prisma.electorate.findUnique({ where: { id } }) as any;
  if (!electorate) notFound();

  const partyColor = getPartyColor(electorate.mpParty);
  const isHouse = electorate.mpChamber === 'House of Reps';

  // All votes for this electorate grouped by bill + position
  const votesByBill = await prisma.vote.groupBy({
    by: ['billId', 'position'],
    where: { electorateId: id },
    _count: true,
  });

  // Unique bill IDs sorted by total vote count
  const billVoteCounts: Record<string, number> = {};
  votesByBill.forEach(r => { billVoteCounts[r.billId] = (billVoteCounts[r.billId] || 0) + r._count; });
  const sortedBillIds = Object.entries(billVoteCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([id]) => id);

  const bills = sortedBillIds.length > 0
    ? await prisma.bill.findMany({
        where: { id: { in: sortedBillIds } },
        select: { id: true, title: true, chamber: true, status: true },
      })
    : [];

  // National stats for comparison
  const nationalStats = sortedBillIds.length > 0
    ? await prisma.vote.groupBy({
        by: ['billId', 'position'],
        where: { billId: { in: sortedBillIds } },
        _count: true,
      })
    : [];

  const totalElect = Object.values(billVoteCounts).reduce((s, n) => s + n, 0);
  const supportCount = votesByBill.filter(r => r.position === 'SUPPORT').reduce((s, r) => s + r._count, 0);
  const opposeCount = votesByBill.filter(r => r.position === 'OPPOSE').reduce((s, r) => s + r._count, 0);
  const abstainCount = votesByBill.filter(r => r.position === 'ABSTAIN').reduce((s, r) => s + r._count, 0);

  function getPositions(billId: string, source: typeof votesByBill) {
    const rows = source.filter(r => r.billId === billId);
    const total = rows.reduce((s, r) => s + r._count, 0);
    const get = (pos: string) => rows.find(r => r.position === pos)?._count || 0;
    const pct = (pos: string) => total > 0 ? Math.round((get(pos) / total) * 100) : 0;
    return { total, supportPct: pct('SUPPORT'), opposePct: pct('OPPOSE'), abstainPct: pct('ABSTAIN') };
  }

  const billMap = Object.fromEntries(bills.map(b => [b.id, b]));

  return (
    <main style={{ backgroundColor: '#0B1220', minHeight: '100vh', color: '#F5F7FB' }}>
      <Nav />
      <div className='page-container'>
        <Link href="/electorates" style={{ color: '#2E8B57', fontSize: '13px', textDecoration: 'none', display: 'block', marginBottom: '24px' }}>
          ← All electorates
        </Link>

        {/* Header */}
        <div style={{ backgroundColor: '#111A2E', border: '1px solid #25324D', borderRadius: '12px', padding: '28px', marginBottom: '16px' }}>
          <div className='mp-header'>
            {electorate.mpPhotoUrl && (
              <img
                src={electorate.mpPhotoUrl}
                alt={electorate.mpName || ''}
                className='mp-photo' style={{ width: '88px', height: '108px', borderRadius: '8px', objectFit: 'cover', objectPosition: 'top', border: '2px solid #25324D', flexShrink: 0 }}
              />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '8px' }}>
                <div>
                  <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#F5F7FB', margin: 0 }}>
                    Division of {electorate.name}
                  </h1>
                  <p style={{ color: '#7E8AA3', margin: '4px 0 0', fontSize: '14px' }}>{electorate.state}</p>
                </div>
                <span style={{
                  backgroundColor: isHouse ? 'rgba(49,130,206,0.15)' : 'rgba(130,80,200,0.15)',
                  color: isHouse ? '#63B3ED' : '#B794F4',
                  fontSize: '11px', padding: '4px 10px', borderRadius: '20px',
                  fontWeight: 600, flexShrink: 0,
                  border: `1px solid ${isHouse ? 'rgba(49,130,206,0.3)' : 'rgba(130,80,200,0.3)'}`
                }}>
                  {isHouse ? '🏛 House of Reps' : '🔱 Senate'}
                </span>
              </div>

              {electorate.mpName && (
                <div style={{ marginTop: '12px' }}>
                  <p style={{ fontSize: '12px', color: '#7E8AA3', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {isHouse ? 'Member for' : 'Senator for'} {electorate.name}
                  </p>
                  <p style={{ fontWeight: 700, color: '#F5F7FB', margin: 0, fontSize: '18px' }}>{electorate.mpName}</p>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '6px', flexWrap: 'wrap' }}>
                    {electorate.mpParty && (
                      <span style={{
                        backgroundColor: `${partyColor}22`, color: partyColor,
                        fontSize: '12px', padding: '2px 10px', borderRadius: '20px',
                        fontWeight: 600, border: `1px solid ${partyColor}44`
                      }}>
                        {electorate.mpParty}
                      </span>
                    )}
                    {electorate.mpId && (
                      <Link href={`/mp/${electorate.mpId}`} style={{ color: '#2E8B57', fontSize: '12px', textDecoration: 'none' }}>
                        Full MP profile →
                      </Link>
                    )}
                  </div>
                  {electorate.mpEmail && (
                    <a href={`mailto:${electorate.mpEmail}`} style={{ color: '#7E8AA3', fontSize: '13px', textDecoration: 'none', display: 'block', marginTop: '8px' }}>
                      ✉ {electorate.mpEmail}
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Overall sentiment */}
        <div style={{ backgroundColor: '#111A2E', border: '1px solid #25324D', borderRadius: '12px', padding: '24px', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#F5F7FB', margin: '0 0 6px' }}>
            How {electorate.name} is voting
          </h2>
          <p style={{ color: '#7E8AA3', fontSize: '13px', margin: '0 0 18px' }}>
            Across all bills on Crossbench
            {totalElect > 0 && ` — ${totalElect.toLocaleString()} votes total`}
          </p>

          {totalElect === 0 ? (
            <p style={{ color: '#4A5568', fontSize: '14px', margin: 0 }}>
              No votes from this electorate yet.{' '}
              <Link href="/bills" style={{ color: '#2E8B57', textDecoration: 'none' }}>Be the first →</Link>
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {[
                { label: 'Support', count: supportCount, color: '#2E8B57' },
                { label: 'Oppose', count: opposeCount, color: '#D95C4B' },
                { label: 'Abstain', count: abstainCount, color: '#6F7D95' },
              ].map(({ label, count, color }) => {
                const pct = totalElect > 0 ? Math.round((count / totalElect) * 100) : 0;
                return (
                  <div key={label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color }}>{label}</span>
                      <span style={{ fontSize: '13px', color: '#7E8AA3' }}>{count.toLocaleString()} ({pct}%)</span>
                    </div>
                    <div style={{ height: '8px', backgroundColor: '#16213A', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, backgroundColor: color, borderRadius: '4px' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Per-bill breakdown vs national */}
        {sortedBillIds.length > 0 && (
          <div>
            <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#F5F7FB', margin: '0 0 12px' }}>
              {electorate.name} vs Australia — by bill
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {sortedBillIds.map(billId => {
                const bill = billMap[billId];
                if (!bill) return null;
                const elect = getPositions(billId, votesByBill);
                const natl = getPositions(billId, nationalStats);

                const dominantLabel = elect.supportPct >= elect.opposePct && elect.supportPct >= elect.abstainPct ? 'Support'
                  : elect.opposePct >= elect.abstainPct ? 'Oppose' : 'Abstain';
                const natlLabel = natl.supportPct >= natl.opposePct && natl.supportPct >= natl.abstainPct ? 'Support'
                  : natl.opposePct >= natl.abstainPct ? 'Oppose' : 'Abstain';
                const aligned = dominantLabel === natlLabel;

                return (
                  <div key={billId} style={{ backgroundColor: '#111A2E', border: '1px solid #25324D', borderRadius: '10px', padding: '18px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '14px' }}>
                      <Link href={`/bills/${billId}`} style={{ textDecoration: 'none', flex: 1 }}>
                        <p style={{ fontSize: '14px', fontWeight: 600, color: '#F5F7FB', margin: '0 0 4px', lineHeight: 1.4 }}>{bill.title}</p>
                        <p style={{ fontSize: '11px', color: '#7E8AA3', margin: 0 }}>{bill.status} · {elect.total} votes in this electorate</p>
                      </Link>
                      <span style={{
                        flexShrink: 0, fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px',
                        backgroundColor: aligned ? 'rgba(46,139,87,0.15)' : 'rgba(217,92,75,0.15)',
                        color: aligned ? '#2E8B57' : '#D95C4B',
                        border: `1px solid ${aligned ? 'rgba(46,139,87,0.3)' : 'rgba(217,92,75,0.3)'}`
                      }}>
                        {aligned ? '≈ Aligned' : '≠ Diverges'}
                      </span>
                    </div>

                    <div className='compare-grid'>
                      {[
                        { label: `📍 ${electorate.name}`, data: elect },
                        { label: '🇦🇺 National', data: natl },
                      ].map(({ label, data }) => (
                        <div key={label}>
                          <p style={{ fontSize: '10px', color: '#3A4A6A', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
                          {[
                            { pos: 'Support', pct: data.supportPct, color: '#2E8B57' },
                            { pos: 'Oppose', pct: data.opposePct, color: '#D95C4B' },
                            { pos: 'Abstain', pct: data.abstainPct, color: '#6F7D95' },
                          ].map(({ pos, pct, color }) => (
                            <div key={pos} style={{ marginBottom: '5px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                                <span style={{ fontSize: '11px', color: '#7E8AA3' }}>{pos}</span>
                                <span style={{ fontSize: '11px', color, fontWeight: 600 }}>{pct}%</span>
                              </div>
                              <div style={{ height: '4px', backgroundColor: '#16213A', borderRadius: '2px', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${pct}%`, backgroundColor: color, borderRadius: '2px' }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
