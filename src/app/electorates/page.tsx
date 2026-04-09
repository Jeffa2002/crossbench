import { prisma } from '@/lib/prisma';
import Nav from '@/components/Nav';
import Link from 'next/link';

export const revalidate = 3600;

export default async function ElectoratesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; state?: string }>;
}) {
  const { q, state } = await searchParams;

  const electorates = await prisma.electorate.findMany({
    where: {
      ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
      ...(state ? { state: { contains: state, mode: 'insensitive' } } : {}),
    },
    orderBy: { name: 'asc' },
    include: { _count: { select: { votes: true } } },
  });

  const states = ['New South Wales', 'Victoria', 'Queensland', 'Western Australia', 'South Australia', 'Tasmania', 'Australian Capital Territory', 'Northern Territory'];

  return (
    <main style={{ backgroundColor: '#0B1220', minHeight: '100vh', color: '#F5F7FB' }}>
      <Nav />
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '24px' }}>Federal electorates</h1>

        <form style={{ backgroundColor: '#111A2E', border: '1px solid #25324D', borderRadius: '10px', padding: '16px', marginBottom: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <input
            name="q"
            defaultValue={q}
            placeholder="Search electorate..."
            style={{ flex: 1, minWidth: '200px', backgroundColor: '#16213A', border: '1px solid #25324D', borderRadius: '6px', padding: '10px 14px', color: '#F5F7FB', fontSize: '14px' }}
          />
          <select name="state" defaultValue={state} style={{ backgroundColor: '#16213A', border: '1px solid #25324D', borderRadius: '6px', padding: '10px 14px', color: '#F5F7FB', fontSize: '14px' }}>
            <option value="">All states</option>
            {states.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button type="submit" style={{ backgroundColor: '#2E8B57', color: '#fff', border: 'none', borderRadius: '6px', padding: '10px 20px', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}>
            Search
          </button>
        </form>

        <p style={{ color: '#7E8AA3', fontSize: '13px', marginBottom: '16px' }}>{electorates.length} electorates</p>

        <div style={{ display: 'grid', gap: '8px', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
          {electorates.map(e => (
            <Link
              key={e.id}
              href={`/electorates/${e.id}`}
              style={{
                backgroundColor: '#111A2E', border: '1px solid #25324D', borderRadius: '10px',
                padding: '16px', textDecoration: 'none', display: 'flex',
                alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px'
              }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ fontWeight: 600, color: '#F5F7FB', margin: 0, fontSize: '14px' }}>{e.name}</p>
                <p style={{ fontSize: '12px', color: '#7E8AA3', margin: '2px 0 0' }}>{e.state}</p>
                {e.mpName && <p style={{ fontSize: '12px', color: '#B6C0D1', margin: '4px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.mpName}</p>}
                {e.mpParty && <p style={{ fontSize: '11px', color: '#7E8AA3', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.mpParty}</p>}
              </div>
              {e._count.votes > 0 && (
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#D6A94A' }}>{e._count.votes}</div>
                  <div style={{ fontSize: '11px', color: '#7E8AA3' }}>votes</div>
                </div>
              )}
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
