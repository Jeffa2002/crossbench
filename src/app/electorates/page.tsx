import { prisma } from '@/lib/prisma';
import Nav from '@/components/Nav';
import Link from 'next/link';

export const revalidate = 300;

const PARTY_COLORS: Record<string, string> = {
  'labor': '#E53E3E',
  'liberal': '#3182CE',
  'national': '#38A169',
  'green': '#48BB78',
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

export default async function ElectoratesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; state?: string; chamber?: string }>;
}) {
  const { q, state: stateFilter, chamber } = await searchParams;

  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { mpName: { contains: q, mode: 'insensitive' } },
      { mpParty: { contains: q, mode: 'insensitive' } },
    ];
  }
  if (stateFilter) where.state = stateFilter;
  if (chamber) where.mpChamber = chamber;

  const [electorates, states] = await Promise.all([
    prisma.electorate.findMany({
      where,
      orderBy: { name: 'asc' },
      select: {
        id: true, name: true, state: true,
        mpName: true, mpParty: true, mpEmail: true,
        mpPhotoUrl: true, mpChamber: true,
        _count: { select: { votes: true } },
      },
    }),
    prisma.electorate.groupBy({ by: ['state'], orderBy: { state: 'asc' } }),
  ]);

  const totalVotes = electorates.reduce((s, e) => s + e._count.votes, 0);

  return (
    <main style={{ backgroundColor: '#0B1220', minHeight: '100vh', color: '#F5F7FB' }}>
      <Nav />
      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '48px 24px' }}>

        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 700, margin: '0 0 8px' }}>Electorates</h1>
          <p style={{ color: '#7E8AA3', margin: 0, fontSize: '15px' }}>
            {electorates.length} electorates · {totalVotes.toLocaleString()} votes cast
          </p>
        </div>

        {/* Filters */}
        <form method="GET" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '28px' }}>
          <input
            name="q"
            defaultValue={q || ''}
            placeholder="Search electorate or MP name..."
            style={{
              flex: '1 1 220px', backgroundColor: '#111A2E', border: '1px solid #25324D',
              borderRadius: '8px', padding: '10px 14px', color: '#F5F7FB', fontSize: '14px',
              outline: 'none',
            }}
          />
          <select
            name="state"
            defaultValue={stateFilter || ''}
            style={{
              backgroundColor: '#111A2E', border: '1px solid #25324D', borderRadius: '8px',
              padding: '10px 14px', color: stateFilter ? '#F5F7FB' : '#7E8AA3', fontSize: '14px',
            }}
          >
            <option value="">All states</option>
            {states.map(s => (
              <option key={s.state} value={s.state}>{s.state}</option>
            ))}
          </select>
          <select
            name="chamber"
            defaultValue={chamber || ''}
            style={{
              backgroundColor: '#111A2E', border: '1px solid #25324D', borderRadius: '8px',
              padding: '10px 14px', color: chamber ? '#F5F7FB' : '#7E8AA3', fontSize: '14px',
            }}
          >
            <option value="">All chambers</option>
            <option value="House of Reps">🏛 House of Reps</option>
            <option value="Senate">🔱 Senators</option>
          </select>
          <button
            type="submit"
            style={{
              backgroundColor: '#2E8B57', color: '#fff', border: 'none', borderRadius: '8px',
              padding: '10px 20px', fontWeight: 600, cursor: 'pointer', fontSize: '14px',
            }}
          >
            Search
          </button>
          {(q || stateFilter || chamber) && (
            <a
              href="/electorates"
              style={{
                backgroundColor: '#16213A', color: '#B6C0D1', border: '1px solid #25324D',
                borderRadius: '8px', padding: '10px 16px', fontSize: '14px', textDecoration: 'none',
              }}
            >
              Clear
            </a>
          )}
        </form>

        {/* Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
          {electorates.map(e => {
            const partyColor = getPartyColor(e.mpParty);
            const isHouse = !e.mpChamber || e.mpChamber === 'House of Reps';
            return (
              <Link
                key={e.id}
                href={`/electorates/${e.id}`}
                style={{
                  backgroundColor: '#111A2E', border: '1px solid #25324D', borderRadius: '10px',
                  padding: '16px', textDecoration: 'none', display: 'flex', gap: '14px',
                  alignItems: 'flex-start', transition: 'border-color 0.15s',
                }}
              >
                {/* Photo thumbnail */}
                <div style={{
                  width: '52px', height: '64px', borderRadius: '6px', overflow: 'hidden',
                  backgroundColor: '#16213A', flexShrink: 0, border: '1px solid #25324D',
                }}>
                  {e.mpPhotoUrl ? (
                    <img
                      src={e.mpPhotoUrl}
                      alt={e.mpName || e.name}
                      width={52}
                      height={64}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 800, color: '#4E8FD4', backgroundColor: '#111A2E' }}>
                      {(e.mpName || '').split(' ').filter((w: string) => w.match(/^[A-Z]/)).slice(0, 2).map((w: string) => w[0]).join('')}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', marginBottom: '2px' }}>
                    <p style={{ fontWeight: 700, color: '#F5F7FB', margin: 0, fontSize: '15px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {e.name}
                    </p>
                    <span style={{
                      fontSize: '10px', flexShrink: 0,
                      backgroundColor: isHouse ? 'rgba(49,130,206,0.12)' : 'rgba(130,80,200,0.12)',
                      color: isHouse ? '#63B3ED' : '#B794F4',
                      padding: '2px 7px', borderRadius: '10px', fontWeight: 600,
                    }}>
                      {isHouse ? 'HoR' : 'SEN'}
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#7E8AA3', margin: '0 0 6px' }}>{e.state}</p>
                  {e.mpName && (
                    <p style={{ fontSize: '12px', color: '#B6C0D1', margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {e.mpName}
                    </p>
                  )}
                  {e.mpParty && (
                    <span style={{
                      fontSize: '10px', backgroundColor: `${partyColor}18`, color: partyColor,
                      padding: '1px 7px', borderRadius: '8px', fontWeight: 600,
                    }}>
                      {e.mpParty.replace('Australian ', '').replace(' of Australia', '')}
                    </span>
                  )}
                  {e._count.votes > 0 && (
                    <p style={{ fontSize: '11px', color: '#4A5568', margin: '6px 0 0' }}>
                      {e._count.votes} vote{e._count.votes !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>

        {electorates.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 24px', color: '#7E8AA3' }}>
            No electorates match your search.
          </div>
        )}
      </div>
    </main>
  );
}
