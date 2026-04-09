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
    <main className="min-h-screen bg-gray-50">
      <Nav />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Federal electorates</h1>

        <form className="bg-white rounded-lg border border-gray-200 p-4 mb-6 flex gap-3 flex-wrap">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search electorate..."
            className="flex-1 min-w-48 border border-gray-300 rounded px-3 py-2 text-sm"
          />
          <select name="state" defaultValue={state} className="border border-gray-300 rounded px-3 py-2 text-sm">
            <option value="">All states</option>
            {states.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700">
            Search
          </button>
        </form>

        <div className="text-sm text-gray-500 mb-4">{electorates.length} electorates</div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {electorates.map(e => (
            <Link
              key={e.id}
              href={`/electorates/${e.id}`}
              className="bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900">{e.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{e.state}</p>
                  {e.mpName && (
                    <p className="text-xs text-gray-600 mt-1 truncate">{e.mpName}</p>
                  )}
                  {e.mpParty && (
                    <p className="text-xs text-gray-400 truncate">{e.mpParty}</p>
                  )}
                </div>
                {e._count.votes > 0 && (
                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold text-blue-700">{e._count.votes}</div>
                    <div className="text-xs text-gray-400">votes</div>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
