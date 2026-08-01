import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, rateLimitKey } from '@/lib/rate-limit';
import { verifyPageViewToken } from '@/lib/analytics-token';

export async function POST(req: NextRequest) {
  const limited = await checkRateLimit(rateLimitKey(req, 'analytics-pageview-end'), 240, 60 * 1000);
  if (!limited.ok) return NextResponse.json({ error: 'Rate limited' }, { status: 429 });

  const body = await req.json().catch(() => ({}));

  // C-01: require a server-signed token that binds the pageView to its session.
  // This prevents forging/guessing pageView ids to poison duration data.
  const verified = verifyPageViewToken(body.pageViewToken);
  if (!verified) return new NextResponse(null, { status: 204 });

  const durationSeconds = Math.max(0, Math.min(60 * 60 * 4, Math.round(Number(body.durationSeconds) || 0)));

  await prisma.webPageView.updateMany({
    where: { id: verified.pageViewId, sessionId: verified.sessionId },
    data: { durationSeconds, endedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
