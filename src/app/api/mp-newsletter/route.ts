import { randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

function normalizeEmail(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function isLikelyEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function createUnsubscribeToken() {
  return randomBytes(24).toString('hex');
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = normalizeEmail(body.email);
  const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim().slice(0, 120) : null;
  const source = typeof body.source === 'string' && body.source.trim() ? body.source.trim().slice(0, 80) : 'mp-updates';

  if (!email || !isLikelyEmail(email)) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
  }

  const session = await auth();
  const sessionEmail = normalizeEmail(session?.user?.email);
  const isOwnSessionEmail = sessionEmail && sessionEmail === email;
  const isAphEmail = email.endsWith('@aph.gov.au');

  if (!isAphEmail && !isOwnSessionEmail) {
    return NextResponse.json({ error: 'Use an APH email address, or sign in with this address first.' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { electorateId: true, name: true },
  });

  const existing = await prisma.mpNewsletterSubscription.findUnique({
    where: { email },
    select: { active: true },
  });

  const subscriber = await prisma.mpNewsletterSubscription.upsert({
    where: { email },
    create: {
      email,
      name: name ?? user?.name ?? null,
      source,
      electorateId: user?.electorateId ?? null,
      unsubscribeToken: createUnsubscribeToken(),
    },
    update: {
      active: true,
      name: name ?? user?.name ?? undefined,
      source,
      electorateId: user?.electorateId ?? undefined,
      subscribedAt: new Date(),
      unsubscribedAt: null,
    },
    select: { active: true },
  });

  return NextResponse.json({
    ok: true,
    active: subscriber.active,
    alreadySubscribed: existing?.active ?? false,
  });
}
