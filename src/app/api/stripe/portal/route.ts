import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: (session.user as any).id },
    select: { stripeCustomerId: true },
  });

  if (!(user as any)?.stripeCustomerId) {
    return NextResponse.json({ error: 'No billing account found' }, { status: 400 });
  }

  const origin = req.headers.get('origin') || process.env.NEXTAUTH_URL;

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: (user as any).stripeCustomerId,
    return_url: `${origin}/mp-dashboard/billing`,
  });

  return NextResponse.json({ url: portalSession.url });
}
