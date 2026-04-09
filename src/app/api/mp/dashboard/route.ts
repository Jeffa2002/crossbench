import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: (session.user as any).id },
    select: {
      role: true,
      electorateId: true,
      subscriptionStatus: true,
      subscriptionTier: true,
      trialEndsAt: true,
      electorate: true,
    },
  });

  if (!user || (user as any).role !== 'MP') {
    return NextResponse.json({ error: 'MP access required' }, { status: 403 });
  }

  const electorate = (user as any).electorate;
  if (!electorate) {
    return NextResponse.json({ error: 'No electorate linked to your account' }, { status: 404 });
  }

  // Trial days remaining
  const trialDaysLeft = (user as any).trialEndsAt
    ? Math.ceil(((user as any).trialEndsAt.getTime() - Date.now()) / 86400000)
    : null;

  // All votes for this electorate
  const votesByBill = await prisma.vote.groupBy({
    by: ['billId', 'position'],
    where: { electorateId: electorate.id },
    _count: true,
  });

  // Bill IDs sorted by vote count
  const billCounts: Record<string, number> = {};
  votesByBill.forEach(r => { billCounts[r.billId] = (billCounts[r.billId] || 0) + r._count; });
  const topBillIds = Object.entries(billCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 15)
    .map(([id]) => id);

  const bills = topBillIds.length > 0
    ? await prisma.bill.findMany({
        where: { id: { in: topBillIds } },
        select: { id: true, title: true, status: true },
      })
    : [];

  // National stats
  const nationalStats = topBillIds.length > 0
    ? await prisma.vote.groupBy({
        by: ['billId', 'position'],
        where: { billId: { in: topBillIds } },
        _count: true,
      })
    : [];

  function getPositions(billId: string, source: typeof votesByBill) {
    const rows = source.filter(r => r.billId === billId);
    const total = rows.reduce((s, r) => s + r._count, 0);
    const get = (pos: string) => rows.find(r => r.position === pos)?._count || 0;
    const pct = (pos: string) => total > 0 ? Math.round((get(pos) / total) * 100) : 0;
    return { total, supportPct: pct('SUPPORT'), opposePct: pct('OPPOSE'), abstainPct: pct('ABSTAIN') };
  }

  const totalVotes = Object.values(billCounts).reduce((s, n) => s + n, 0);
  const supportTotal = votesByBill.filter(r => r.position === 'SUPPORT').reduce((s, r) => s + r._count, 0);
  const opposeTotal = votesByBill.filter(r => r.position === 'OPPOSE').reduce((s, r) => s + r._count, 0);
  const abstainTotal = votesByBill.filter(r => r.position === 'ABSTAIN').reduce((s, r) => s + r._count, 0);

  const billMap = Object.fromEntries(bills.map(b => [b.id, b]));

  return NextResponse.json({
    electorate: {
      name: electorate.name,
      state: electorate.state,
      mpName: electorate.mpName,
      mpParty: electorate.mpParty,
      mpPhotoUrl: electorate.mpPhotoUrl,
    },
    subscription: {
      status: (user as any).subscriptionStatus,
      tier: (user as any).subscriptionTier,
      trialEndsAt: (user as any).trialEndsAt?.toISOString() ?? null,
      trialDaysLeft,
    },
    overview: {
      totalVotes,
      supportPct: totalVotes > 0 ? Math.round((supportTotal / totalVotes) * 100) : 0,
      opposePct: totalVotes > 0 ? Math.round((opposeTotal / totalVotes) * 100) : 0,
      abstainPct: totalVotes > 0 ? Math.round((abstainTotal / totalVotes) * 100) : 0,
    },
    bills: topBillIds
      .map(billId => {
        const bill = billMap[billId];
        if (!bill) return null;
        return {
          id: bill.id,
          title: bill.title,
          status: bill.status,
          local: getPositions(billId, votesByBill),
          national: getPositions(billId, nationalStats),
        };
      })
      .filter(Boolean),
  });
}
