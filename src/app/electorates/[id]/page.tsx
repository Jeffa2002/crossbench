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

  // Get vote breakdown for this electorate
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

  // Most voted bills in this electorate
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
    <main className="min-h-screen bg-gray-50">
      <Nav />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link href="/electorates" className="text-sm text-blue-600 hover:underline mb-4 block">← All electorates</Link>

        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{electorate.name}</h1>
              <p className="text-gray-500 mt-1">{electorate.state}</p>
            </div>
            <span className="bg-blue-50 text-blue-700 text-xs px-3 py-1 rounded-full font-medium shrink-0">
              Federal electorate
            </span>
          </div>

          {electorate.mpName && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-500 mb-1">Current MP</p>
              <p className="font-medium text-gray-900">{electorate.mpName}</p>
              {electorate.mpParty && <p className="text-sm text-gray-500">{electorate.mpParty}</p>}
              {electorate.mpEmail && (
                <a href={`mailto:${electorate.mpEmail}`} className="text-sm text-blue-600 hover:underline mt-1 block">
                  {electorate.mpEmail}
                </a>
              )}
            </div>
          )}
        </div>

        {/* Vote breakdown */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            How {electorate.name} is voting
            {total > 0 && <span className="text-gray-400 font-normal text-base ml-2">({total} votes across all bills)</span>}
          </h2>
          {total === 0 ? (
            <p className="text-gray-500 text-sm">No votes yet from this electorate. <Link href="/bills" className="text-blue-600 hover:underline">Be the first →</Link></p>
          ) : (
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-green-700">Support</span>
                  <span className="text-gray-500">{support} ({supportPct}%)</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: `${supportPct}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-red-700">Oppose</span>
                  <span className="text-gray-500">{oppose} ({opposePct}%)</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-red-500 rounded-full" style={{ width: `${opposePct}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-600">Abstain</span>
                  <span className="text-gray-500">{abstain}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Most active bills */}
        {bills.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Most voted bills in {electorate.name}</h2>
            <div className="space-y-3">
              {bills.map(bill => (
                <Link key={bill.id} href={`/bills/${bill.id}`} className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-all">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 line-clamp-2">{bill.title}</p>
                    <div className="flex gap-2 mt-1">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{bill.chamber}</span>
                      <span className="text-xs text-gray-400">{bill.status}</span>
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
