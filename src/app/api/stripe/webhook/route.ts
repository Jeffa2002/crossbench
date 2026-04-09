import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';

export const config = { api: { bodyParser: false } };

export async function POST(req: NextRequest) {
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
      const { userId, tier } = session.metadata ?? {};
      if (!userId || !tier) break;

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

      const status = sub.status === 'active' ? 'ACTIVE'
        : sub.status === 'past_due' ? 'PAST_DUE'
        : sub.status === 'canceled' ? 'CANCELLED'
        : null;

      if (status) {
        await prisma.user.update({
          where: { id: userId },
          data: { subscriptionStatus: status, subscriptionId: sub.id } as any,
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
