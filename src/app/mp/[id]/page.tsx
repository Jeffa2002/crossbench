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

export default async function MPPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Find electorate by mpId
  const electorate = await prisma.electorate.findFirst({
    where: { mpId: id } as any,
  }) as any;

  if (!electorate) notFound();

  const partyColor = getPartyColor(electorate.mpParty);
  const isHouse = electorate.mpChamber === 'House of Reps';

  // Get all votes for this electorate, grouped by bill + position
  const votesByBill = await prisma.vote.groupBy({
    by: ['billId', 'position'],
    where: { electorateId: electorate.id },
    _count: true,
    orderBy: { _count: { billId: 'desc' } },
  });

  // Get unique bill IDs sorted by vote count
  const billVoteCounts: Record<string, number> = {};
  votesByBill.forEach(r => {
    billVoteCounts[r.billId] = (billVoteCounts[r.billId] || 0) + r._count;
  });
  const sortedBillIds = Object.entries(billVoteCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([id]) => id);

  const bills = sortedBillIds.length > 0
    ? await prisma.bill.findMany({
        where: { id: { in: sortedBillIds } },
        select: { id: true, title: true, chamber: true, status: true, aiSummary: true },
      })
    : [];

  // National stats for same bills
  const nationalStats = sortedBillIds.length > 0
    ? await prisma.vote.groupBy({
        by: ['billId', 'position'],
        where: { billId: { in: sortedBillIds } },
        _count: true,
      })
    : [];

  // Overall electorate totals
  const totalElect = Object.values(billVoteCounts).reduce((s, n) => s + n, 0);
  const supportCount = votesByBill.filter(r => r.position === 'SUPPORT').reduce((s, r) => s + r._count, 0);
  const opposeCount = votesByBill.filter(r => r.position === 'OPPOSE').reduce((s, r) => s + r._count, 0);
  const abstainCount = votesByBill.filter(r => r.position === 'ABSTAIN').reduce((s, r) => s + r._count, 0);

  function getPositions(billId: string, source: typeof votesByBill) {
    const rows = source.filter(r => r.billId === billId);
    const total = rows.reduce((s, r) => s + r._count, 0);
    const get = (pos: string) => rows.find(r => r.position === pos)?._count || 0;
    const pct = (pos: string) => total > 0 ? Math.round((get(pos) / total) * 100) : 0;
    return { total, support: get('SUPPORT'), oppose: get('OPPOSE'), abstain: get('ABSTAIN'), supportPct: pct('SUPPORT'), opposePct: pct('OPPOSE'), abstainPct: pct('ABSTAIN') };
  }

  // Sort bills by our vote count order
  const billMap = Object.fromEntries(bills.map(b => [b.id, b]));

  return (
    <main style={{ backgroundColor: '#0B1220', minHeight: '100vh', color: '#F5F7FB' }}>
      <Nav />
      <div className='page-container'>
        <Link href="/electorates" style={{ color: '#2E8B57', fontSize: '13px', textDecoration: 'none', display: 'block', marginBottom: '24px' }}>
          ← All electorates
        </Link>

        {/* MP header */}
        <div style={{ backgroundColor: '#111A2E', border: '1px solid #25324D', borderRadius: '12px', padding: '28px', marginBottom: '16px' }}>
          <div className='mp-header'>
            {electorate.mpPhotoUrl && (
              <img
                src={electorate.mpPhotoUrl}
                alt={electorate.mpName}
                className='mp-photo' style={{ width: '110px', height: '134px', borderRadius: '10px', objectFit: 'cover', objectPosition: 'top', border: '2px solid #25324D', flexShrink: 0 }}
              />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                <span style={{
                  backgroundColor: isHouse ? 'rgba(49,130,206,0.15)' : 'rgba(130,80,200,0.15)',
                  color: isHouse ? '#63B3ED' : '#B794F4',
                  fontSize: '11px', padding: '3px 10px', borderRadius: '20px', fontWeight: 600,
                  border: `1px solid ${isHouse ? 'rgba(49,130,206,0.3)' : 'rgba(130,80,200,0.3)'}`
                }}>
                  {isHouse ? '🏛 House of Representatives' : '🔱 Senate'}
                </span>
                <span style={{ backgroundColor: '#16213A', color: '#B6C0D1', fontSize: '11px', padding: '3px 10px', borderRadius: '20px' }}>
                  {electorate.state}
                </span>
              </div>

              <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#F5F7FB', margin: '0 0 6px' }}>
                {electorate.mpName}
              </h1>
              <p style={{ color: '#7E8AA3', fontSize: '14px', margin: '0 0 10px' }}>
                {isHouse ? 'Member for' : 'Senator for'}{' '}
                <Link href={`/electorates/${electorate.id}`} style={{ color: '#2E8B57', textDecoration: 'none' }}>
                  {electorate.name}
                </Link>
              </p>

              {electorate.mpParty && (
                <span style={{
                  display: 'inline-block',
                  backgroundColor: `${partyColor}22`, color: partyColor,
                  fontSize: '13px', padding: '4px 12px', borderRadius: '20px',
                  fontWeight: 700, border: `1px solid ${partyColor}44`
                }}>
                  {electorate.mpParty}
                </span>
              )}

              {electorate.mpEmail && (
                <a href={`mailto:${electorate.mpEmail}`} style={{
                  color: '#2E8B57', fontSize: '13px', textDecoration: 'none', display: 'block', marginTop: '12px'
                }}>
                  ✉ {electorate.mpEmail}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Constituent sentiment overview */}
        <div style={{ backgroundColor: '#111A2E', border: '1px solid #25324D', borderRadius: '12px', padding: '24px', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#F5F7FB', margin: '0 0 6px' }}>
            Constituent sentiment
          </h2>
          <p style={{ color: '#7E8AA3', fontSize: '13px', margin: '0 0 20px' }}>
            How voters in {electorate.name} are voting across all bills on Crossbench
            {totalElect > 0 && ` — ${totalElect.toLocaleString()} votes total`}
          </p>

          {totalElect === 0 ? (
            <p style={{ color: '#4A5568', fontSize: '14px', margin: 0 }}>
              No votes from this electorate yet.{' '}
              <Link href="/bills" style={{ color: '#2E8B57', textDecoration: 'none' }}>Browse bills →</Link>
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

        {/* Per-bill breakdown */}
        {sortedBillIds.length > 0 && (
          <div>
            <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#F5F7FB', margin: '0 0 12px' }}>
              Bill-by-bill: {electorate.name} vs Australia
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {sortedBillIds.map(billId => {
                const bill = billMap[billId];
                if (!bill) return null;
                const elect = getPositions(billId, votesByBill);
                const natl = getPositions(billId, nationalStats);

                // Determine the dominant local position
                const dominant = elect.supportPct >= elect.opposePct && elect.supportPct >= elect.abstainPct
                  ? { label: 'Support', pct: elect.supportPct, color: '#2E8B57' }
                  : elect.opposePct >= elect.abstainPct
                  ? { label: 'Oppose', pct: elect.opposePct, color: '#D95C4B' }
                  : { label: 'Abstain', pct: elect.abstainPct, color: '#6F7D95' };

                const natDominant = natl.supportPct >= natl.opposePct && natl.supportPct >= natl.abstainPct
                  ? { label: 'Support', pct: natl.supportPct, color: '#2E8B57' }
                  : natl.opposePct >= natl.abstainPct
                  ? { label: 'Oppose', pct: natl.opposePct, color: '#D95C4B' }
                  : { label: 'Abstain', pct: natl.abstainPct, color: '#6F7D95' };

                const aligned = dominant.label === natDominant.label;

                return (
                  <div key={billId} style={{ backgroundColor: '#111A2E', border: '1px solid #25324D', borderRadius: '10px', padding: '18px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '14px' }}>
                      <Link href={`/bills/${billId}`} style={{ textDecoration: 'none', flex: 1 }}>
                        <p style={{ fontSize: '14px', fontWeight: 600, color: '#F5F7FB', margin: '0 0 4px', lineHeight: 1.4 }}>
                          {bill.title}
                        </p>
                        <p style={{ fontSize: '11px', color: '#7E8AA3', margin: 0 }}>{bill.status} · {elect.total} local votes</p>
                      </Link>
                      <span style={{
                        flexShrink: 0, fontSize: '11px', fontWeight: 700, padding: '3px 10px',
                        borderRadius: '20px',
                        backgroundColor: aligned ? 'rgba(46,139,87,0.15)' : 'rgba(217,92,75,0.15)',
                        color: aligned ? '#2E8B57' : '#D95C4B',
                        border: `1px solid ${aligned ? 'rgba(46,139,87,0.3)' : 'rgba(217,92,75,0.3)'}`
                      }}>
                        {aligned ? '≈ Aligned' : '≠ Diverges'}
                      </span>
                    </div>

                    {/* Side-by-side bars */}
                    <div className='compare-grid'>
                      {/* Electorate */}
                      <div>
                        <p style={{ fontSize: '10px', color: '#3A4A6A', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          📍 {electorate.name}
                        </p>
                        {[
                          { pos: 'Support', pct: elect.supportPct, color: '#2E8B57' },
                          { pos: 'Oppose', pct: elect.opposePct, color: '#D95C4B' },
                          { pos: 'Abstain', pct: elect.abstainPct, color: '#6F7D95' },
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

                      {/* National */}
                      <div>
                        <p style={{ fontSize: '10px', color: '#3A4A6A', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          🇦🇺 National
                        </p>
                        {[
                          { pos: 'Support', pct: natl.supportPct, color: '#2E8B57' },
                          { pos: 'Oppose', pct: natl.opposePct, color: '#D95C4B' },
                          { pos: 'Abstain', pct: natl.abstainPct, color: '#6F7D95' },
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
