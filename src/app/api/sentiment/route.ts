import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/sentiment?mpIds=id1,id2,...
// Returns aggregate sentiment + current user's vote for each mpId
export async function GET(req: NextRequest) {
  const mpIdsParam = req.nextUrl.searchParams.get('mpIds');
  if (!mpIdsParam) return NextResponse.json({ error: 'mpIds required' }, { status: 400 });
  const mpIds = mpIdsParam.split(',').filter(Boolean).slice(0, 100); // cap at 100

  const session = await auth();
  const userId = (session?.user as any)?.id ?? null;

  // Aggregate counts per mpId
  const counts = await prisma.mpSentiment.groupBy({
    by: ['mpId', 'sentiment'],
    where: { mpId: { in: mpIds } },
    _count: true,
  });

  // Current user's votes
  const userVotes = userId
    ? await prisma.mpSentiment.findMany({
        where: { userId, mpId: { in: mpIds } },
        select: { mpId: true, sentiment: true },
      })
    : [];

  const userVoteMap = Object.fromEntries(userVotes.map(v => [v.mpId, v.sentiment]));

  const result: Record<string, { positive: number; negative: number; total: number; positivePct: number; userVote: string | null }> = {};
  for (const mpId of mpIds) {
    const pos = counts.find(c => c.mpId === mpId && c.sentiment === 'POSITIVE')?._count ?? 0;
    const neg = counts.find(c => c.mpId === mpId && c.sentiment === 'NEGATIVE')?._count ?? 0;
    const total = pos + neg;
    result[mpId] = {
      positive: pos,
      negative: neg,
      total,
      positivePct: total > 0 ? Math.round((pos / total) * 100) : 0,
      userVote: userVoteMap[mpId] ?? null,
    };
  }

  return NextResponse.json(result);
}

// POST /api/sentiment  { mpId, sentiment: 'POSITIVE' | 'NEGATIVE' | null }
// null = remove vote
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: (session.user as any).id },
    select: { id: true, verificationStatus: true },
  });

  if (!user || user.verificationStatus === 'NONE') {
    return NextResponse.json({ error: 'Address verification required to rate MPs' }, { status: 403 });
  }

  const { mpId, sentiment } = await req.json();
  if (!mpId) return NextResponse.json({ error: 'mpId required' }, { status: 400 });
  if (sentiment && !['POSITIVE', 'NEGATIVE'].includes(sentiment)) {
    return NextResponse.json({ error: 'Invalid sentiment' }, { status: 400 });
  }

  // Verify the mpId exists in our DB
  const electorate = await prisma.electorate.findFirst({ where: { mpId }, select: { id: true } });
  if (!electorate) return NextResponse.json({ error: 'MP not found' }, { status: 404 });

  if (!sentiment) {
    // Remove vote
    await prisma.mpSentiment.deleteMany({ where: { userId: user.id, mpId } });
    return NextResponse.json({ ok: true, action: 'removed' });
  }

  await prisma.mpSentiment.upsert({
    where: { userId_mpId: { userId: user.id, mpId } },
    create: { userId: user.id, mpId, sentiment },
    update: { sentiment, updatedAt: new Date() },
  });

  return NextResponse.json({ ok: true, action: 'saved', sentiment });
}
