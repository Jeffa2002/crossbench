import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { stripe, PLANS } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { tier } = await req.json();
  if (tier !== 'PRO' && tier !== 'TEAM') {
    return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: (session.user as any).id },
    select: { email: true, stripeCustomerId: true, name: true },
  });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

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
  const origin = req.headers.get('origin') || process.env.NEXTAUTH_URL;

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: plan.priceId, quantity: 1 }],
    success_url: `${origin}/mp-dashboard?subscribed=1`,
    cancel_url: `${origin}/mp-dashboard/billing`,
    metadata: { userId: (session.user as any).id, tier },
    subscription_data: {
      metadata: { userId: (session.user as any).id, tier },
    },
  });

  return NextResponse.json({ url: checkoutSession.url });
}
