import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';
import { PLANS } from '@/lib/stripe';

function tierForPrice(priceId: string | null | undefined): 'PRO' | 'TEAM' | null {
  if (priceId && priceId === PLANS.PRO.priceId) return 'PRO';
  if (priceId && priceId === PLANS.TEAM.priceId) return 'TEAM';
  return null;
}

function statusForSubscription(sub: Stripe.Subscription): 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | null {
  if (sub.status === 'active' || sub.status === 'trialing') return 'ACTIVE';
  if (sub.status === 'past_due' || sub.status === 'unpaid') return 'PAST_DUE';
  if (sub.status === 'canceled' || sub.status === 'incomplete_expired') return 'CANCELLED';
  return null;
}

// App Router reads raw body via req.text() — no bodyParser config needed
export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const body = await req.text();
  const sig = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    console.error('Webhook signature failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const { userId } = session.metadata ?? {};
      if (!userId || !session.subscription || !session.customer) break;

      const sub = await stripe.subscriptions.retrieve(session.subscription as string);
      const priceId = sub.items.data[0]?.price.id;
      const tier = tierForPrice(priceId);
      if (!tier) break;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { stripeCustomerId: true, role: true },
      });
      if (!user || user.role !== 'MP' || user.stripeCustomerId !== session.customer) break;

      await prisma.user.update({
        where: { id: userId },
        data: {
          subscriptionStatus: 'ACTIVE',
          subscriptionTier: tier as any,
          subscriptionId: session.subscription as string,
          trialEndsAt: null,
        } as any,
      });
      break;
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.userId;
      if (!userId) break;

      const status = statusForSubscription(sub);
      const tier = tierForPrice(sub.items.data[0]?.price.id);

      if (status) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            subscriptionStatus: status,
            subscriptionId: sub.id,
            ...(tier && { subscriptionTier: tier }),
          } as any,
        });
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.userId;
      if (!userId) break;

      await prisma.user.update({
        where: { id: userId },
        data: {
          subscriptionStatus: 'CANCELLED',
          subscriptionTier: 'FREE',
          subscriptionId: null,
        } as any,
      });
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;
      await prisma.user.updateMany({
        where: { stripeCustomerId: customerId } as any,
        data: { subscriptionStatus: 'PAST_DUE' } as any,
      });
      break;
    }
  }

  return NextResponse.json({ received: true });
}
