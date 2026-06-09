import Nav from '@/components/Nav';
import SentimentClient from './SentimentClient';
import { prisma } from '@/lib/prisma';
import { safeHttpsUrl, MP_PHOTO_URL_HOSTS } from '@/lib/safe-url';
import { addressVerifiedUserWhere } from '@/lib/verification';

export const revalidate = 60; // revalidate every 60s

export default async function SentimentPage() {
  // Fetch all MPs with their sentiment counts
  const electorates = await prisma.electorate.findMany({
    where: { mpId: { not: null }, mpName: { not: null } },
    select: {
      id: true,
      name: true,
      state: true,
      mpId: true,
      mpName: true,
      mpParty: true,
      mpPhotoUrl: true,
      mpChamber: true,
    },
    orderBy: [{ mpParty: 'asc' }, { mpName: 'asc' }],
  });

  // Aggregate sentiment counts
  const sentimentCounts = await prisma.mpSentiment.groupBy({
    by: ['mpId', 'sentiment'],
    where: { user: addressVerifiedUserWhere },
    _count: true,
  });
  const [totalResponses, allResponses, latestResponse] = await Promise.all([
    prisma.mpSentiment.count({ where: { user: addressVerifiedUserWhere } }),
    prisma.mpSentiment.count(),
    prisma.mpSentiment.findFirst({
      where: { user: addressVerifiedUserWhere },
      orderBy: { updatedAt: 'desc' },
      select: { updatedAt: true },
    }),
  ]);

  const countMap: Record<string, { positive: number; negative: number }> = {};
  for (const row of sentimentCounts) {
    if (!countMap[row.mpId]) countMap[row.mpId] = { positive: 0, negative: 0 };
    if (row.sentiment === 'POSITIVE') countMap[row.mpId].positive = row._count;
    else countMap[row.mpId].negative = row._count;
  }

  const mps = electorates.map(e => ({
    ...e,
    mpPhotoUrl: safeHttpsUrl(e.mpPhotoUrl, MP_PHOTO_URL_HOSTS),
    positive: countMap[e.mpId!]?.positive ?? 0,
    negative: countMap[e.mpId!]?.negative ?? 0,
  }));

  // Party aggregates
  const partyMap: Record<string, { positive: number; negative: number; count: number }> = {};
  for (const mp of mps) {
    const party = mp.mpParty || 'Independent';
    if (!partyMap[party]) partyMap[party] = { positive: 0, negative: 0, count: 0 };
    partyMap[party].positive += mp.positive;
    partyMap[party].negative += mp.negative;
    partyMap[party].count += 1;
  }

  const parties = Object.entries(partyMap)
    .map(([name, d]) => ({
      name,
      positive: d.positive,
      negative: d.negative,
      total: d.positive + d.negative,
      positivePct: d.positive + d.negative > 0 ? Math.round((d.positive / (d.positive + d.negative)) * 100) : 0,
      mpCount: d.count,
    }))
    .sort((a, b) => b.total - a.total);

  return (
    <main style={{ backgroundColor: '#0B1220', minHeight: '100vh', color: '#F5F7FB' }}>
      <Nav />
      <SentimentClient
        mps={mps as any}
        parties={parties}
        stats={{
          totalResponses,
          activeMembers: totalResponses,
          verifiedShare: allResponses > 0 ? Math.round((totalResponses / allResponses) * 100) : 0,
          lastUpdated: latestResponse?.updatedAt?.toISOString() ?? null,
        }}
      />
    </main>
  );
}
