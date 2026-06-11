import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, rateLimitKey } from '@/lib/rate-limit';

function cleanString(value: unknown, max = 500) {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null;
}

function clientIp(req: NextRequest) {
  return req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;
}

function hashIp(ip: string | null) {
  if (!ip) return null;
  const secret = process.env.ANALYTICS_HASH_SECRET || process.env.NEXTAUTH_SECRET || process.env.MISSION_COOKIE_SECRET || 'crossbench-analytics';
  return createHash('sha256').update(`${secret}:${ip}`).digest('hex');
}

function deviceType(userAgent: string | null) {
  const ua = (userAgent || '').toLowerCase();
  if (/bot|crawler|spider|preview|slurp/.test(ua)) return 'bot';
  if (/mobile|iphone|android/.test(ua)) return 'mobile';
  if (/ipad|tablet/.test(ua)) return 'tablet';
  return 'desktop';
}

function browserName(userAgent: string | null) {
  const ua = userAgent || '';
  if (ua.includes('Edg/')) return 'Edge';
  if (ua.includes('Chrome/')) return 'Chrome';
  if (ua.includes('Firefox/')) return 'Firefox';
  if (ua.includes('Safari/') && !ua.includes('Chrome/')) return 'Safari';
  if (/bot|crawler|spider/i.test(ua)) return 'Bot';
  return 'Other';
}

export async function POST(req: NextRequest) {
  const limited = checkRateLimit(rateLimitKey(req, 'analytics-pageview'), 120, 60 * 1000);
  if (!limited.ok) return NextResponse.json({ error: 'Rate limited' }, { status: 429 });

  const body = await req.json().catch(() => ({}));
  const sessionId = cleanString(body.sessionId, 120);
  const path = cleanString(body.path, 500);
  if (!sessionId || !path || path.startsWith('/admin')) {
    return new NextResponse(null, { status: 204 });
  }

  const userAgent = cleanString(req.headers.get('user-agent'), 800);
  const now = new Date();

  await prisma.webVisitSession.upsert({
    where: { id: sessionId },
    create: {
      id: sessionId,
      ipHash: hashIp(clientIp(req)),
      countryCode: cleanString(req.headers.get('cf-ipcountry'), 8),
      region: cleanString(req.headers.get('cf-region'), 120),
      city: cleanString(req.headers.get('cf-ipcity'), 120),
      userAgent,
      deviceType: deviceType(userAgent),
      browser: browserName(userAgent),
      firstPath: path,
      lastPath: path,
      referrer: cleanString(body.referrer, 800),
      startedAt: now,
      lastSeenAt: now,
    },
    update: {
      lastPath: path,
      lastSeenAt: now,
    },
  });

  const view = await prisma.webPageView.create({
    data: {
      sessionId,
      path,
      title: cleanString(body.title, 300),
      referrer: cleanString(body.referrer, 800),
      startedAt: now,
    },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, pageViewId: view.id });
}
