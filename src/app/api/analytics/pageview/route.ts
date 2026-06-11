import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getActiveOfficeMembership } from '@/lib/mp-office';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, rateLimitKey } from '@/lib/rate-limit';

const SENSITIVE_QUERY_KEYS = /token|secret|code|email|password|callback|redirect|session|state/i;

function cleanString(value: unknown, max = 500) {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null;
}

function sanitizeUrlValue(value: string | null, max = 500) {
  if (!value) return null;
  try {
    const url = value.startsWith('/') ? new URL(value, 'https://crossbench.io') : new URL(value);
    const clean = new URLSearchParams();
    url.searchParams.forEach((paramValue, key) => {
      if (!SENSITIVE_QUERY_KEYS.test(key)) clean.set(key, paramValue);
    });
    const query = clean.toString();
    const safeValue = value.startsWith('/')
      ? `${url.pathname}${query ? `?${query}` : ''}`
      : `${url.origin}${url.pathname}${query ? `?${query}` : ''}`;
    return safeValue.slice(0, max);
  } catch {
    return value.split('?')[0].slice(0, max);
  }
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

async function visitorIdentity() {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return { userId: null, visitorType: 'GUEST' };

  const membership = await getActiveOfficeMembership(userId);
  if (membership?.electorate?.mpChamber === 'Senate') return { userId, visitorType: 'SENATOR' };
  if (membership) return { userId, visitorType: 'MP' };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, electorate: { select: { mpChamber: true } } },
  });
  if (user?.role === 'MP') {
    return { userId, visitorType: user.electorate?.mpChamber === 'Senate' ? 'SENATOR' : 'MP' };
  }
  return { userId, visitorType: 'REGISTERED' };
}

export async function POST(req: NextRequest) {
  const limited = checkRateLimit(rateLimitKey(req, 'analytics-pageview'), 120, 60 * 1000);
  if (!limited.ok) return NextResponse.json({ error: 'Rate limited' }, { status: 429 });

  const body = await req.json().catch(() => ({}));
  const sessionId = cleanString(body.sessionId, 120);
  const path = sanitizeUrlValue(cleanString(body.path, 500), 500);
  if (!sessionId || !path || path.startsWith('/admin')) {
    return new NextResponse(null, { status: 204 });
  }

  const userAgent = cleanString(req.headers.get('user-agent'), 800);
  const now = new Date();
  const identity = await visitorIdentity();

  await prisma.webVisitSession.upsert({
    where: { id: sessionId },
    create: {
      id: sessionId,
      userId: identity.userId,
      visitorType: identity.visitorType,
      ipHash: hashIp(clientIp(req)),
      countryCode: cleanString(req.headers.get('cf-ipcountry'), 8),
      region: cleanString(req.headers.get('cf-region'), 120),
      city: cleanString(req.headers.get('cf-ipcity'), 120),
      userAgent,
      deviceType: deviceType(userAgent),
      browser: browserName(userAgent),
      firstPath: path,
      lastPath: path,
      referrer: sanitizeUrlValue(cleanString(body.referrer, 800), 800),
      startedAt: now,
      lastSeenAt: now,
    },
    update: {
      userId: identity.userId,
      visitorType: identity.visitorType,
      lastPath: path,
      lastSeenAt: now,
    },
  });

  const view = await prisma.webPageView.create({
    data: {
      sessionId,
      path,
      title: cleanString(body.title, 300),
      referrer: sanitizeUrlValue(cleanString(body.referrer, 800), 800),
      startedAt: now,
    },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, pageViewId: view.id });
}
