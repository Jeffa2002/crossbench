import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, rateLimitKey } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  const limited = checkRateLimit(rateLimitKey(req, 'analytics-pageview-end'), 240, 60 * 1000);
  if (!limited.ok) return NextResponse.json({ error: 'Rate limited' }, { status: 429 });

  const body = await req.json().catch(() => ({}));
  const pageViewId = typeof body.pageViewId === 'string' ? body.pageViewId : '';
  const durationSeconds = Math.max(0, Math.min(60 * 60 * 4, Math.round(Number(body.durationSeconds) || 0)));
  if (!pageViewId) return new NextResponse(null, { status: 204 });

  await prisma.webPageView.updateMany({
    where: { id: pageViewId },
    data: { durationSeconds, endedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
