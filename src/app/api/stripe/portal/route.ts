import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getStripe } from '@/lib/stripe';
import { appUrl } from '@/lib/app-url';

export async function POST() {
  const stripe = getStripe();
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: (session.user as any).id },
    select: { stripeCustomerId: true },
  });

  if (!(user as any)?.stripeCustomerId) {
    return NextResponse.json({ error: 'No billing account found' }, { status: 400 });
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: (user as any).stripeCustomerId,
    return_url: appUrl('/mp-dashboard/billing'),
  });

  return NextResponse.json({ url: portalSession.url });
}
