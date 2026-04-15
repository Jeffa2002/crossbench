import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const MAX_FREE_CHANGES_PER_YEAR = 1;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = (session.user as any).id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, verifiedAt: true, electorateId: true },
  });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  if (!user.verifiedAt) return NextResponse.json({ error: 'Not verified yet' }, { status: 400 });

  // Count changes in the last 12 months
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const changeCount = await prisma.addressChangeLog.count({
    where: { userId, createdAt: { gte: oneYearAgo } },
  });

  if (changeCount >= MAX_FREE_CHANGES_PER_YEAR) {
    return NextResponse.json({
      error: 'limit_reached',
      message: `You've already changed your address once this year. Further changes require a support ticket for manual review.`,
    }, { status: 429 });
  }

  // Within limit — let them proceed to /account/verify
  return NextResponse.json({ ok: true, changesThisYear: changeCount, remaining: MAX_FREE_CHANGES_PER_YEAR - changeCount });
}
