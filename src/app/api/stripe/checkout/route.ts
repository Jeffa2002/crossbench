import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getStripe, PLANS } from '@/lib/stripe';
import { appUrl } from '@/lib/app-url';

export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { tier } = await req.json();
  if (tier !== 'PRO' && tier !== 'TEAM') {
    return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: (session.user as any).id },
    select: { email: true, stripeCustomerId: true, name: true, role: true, electorateId: true },
  });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  if (user.role !== 'MP') return NextResponse.json({ error: 'MP access required' }, { status: 403 });
  if (!user.electorateId) return NextResponse.json({ error: 'MP account must be linked to an electorate before checkout' }, { status: 400 });

  // Get or create Stripe customer
  let customerId = (user as any).stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email!,
      name: user.name ?? undefined,
      metadata: { userId: (session.user as any).id },
    });
    customerId = customer.id;
    await prisma.user.update({
      where: { id: (session.user as any).id },
      data: { stripeCustomerId: customerId } as any,
    });
  }

  const plan = PLANS[tier as keyof typeof PLANS];
  if (!plan.priceId) return NextResponse.json({ error: 'Plan price is not configured' }, { status: 500 });

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: plan.priceId, quantity: 1 }],
    success_url: appUrl('/mp-dashboard?subscribed=1'),
    cancel_url: appUrl('/mp-dashboard/billing'),
    metadata: { userId: (session.user as any).id, tier },
    subscription_data: {
      metadata: { userId: (session.user as any).id, tier },
    },
  });

  return NextResponse.json({ url: checkoutSession.url });
}
