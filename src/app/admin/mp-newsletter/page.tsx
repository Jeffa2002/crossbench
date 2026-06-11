import { prisma } from '@/lib/prisma';
import AdminMpNewsletterClient from './AdminMpNewsletterClient';

export const dynamic = 'force-dynamic';

export default async function AdminMpNewsletterPage() {
  const [subscriptions, mpUsers, campaigns] = await Promise.all([
    prisma.mpNewsletterSubscription.findMany({
      orderBy: [{ active: 'desc' }, { subscribedAt: 'desc' }],
    }),
    prisma.user.findMany({
      where: { role: 'MP' },
      orderBy: { createdAt: 'desc' },
      include: { electorate: true },
    }),
    prisma.mpNewsletterCampaign.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ]);

  const electorates = subscriptions.some(subscription => subscription.electorateId)
    ? await prisma.electorate.findMany({
        where: { id: { in: subscriptions.map(subscription => subscription.electorateId).filter(Boolean) as string[] } },
        select: { id: true, name: true, state: true },
      })
    : [];
  const electorateById = new Map(electorates.map(electorate => [electorate.id, `${electorate.name} · ${electorate.state}`]));
  const activeSubscriberEmails = new Set(subscriptions.filter(subscription => subscription.active).map(subscription => subscription.email.toLowerCase()));

  const subscribers = subscriptions.map(subscription => ({
    id: subscription.id,
    email: subscription.email,
    name: subscription.name,
    electorate: subscription.electorateId ? electorateById.get(subscription.electorateId) ?? null : null,
    active: subscription.active,
    subscribedAt: subscription.subscribedAt.toISOString(),
    unsubscribedAt: subscription.unsubscribedAt?.toISOString() ?? null,
  }));

  const missingMps = mpUsers
    .filter(mp => !activeSubscriberEmails.has(mp.email.toLowerCase()))
    .map(mp => ({
      email: mp.email,
      name: mp.name,
      electorate: mp.electorate ? `${mp.electorate.name} · ${mp.electorate.state}` : null,
      status: mp.subscriptionStatus,
    }));

  return (
    <AdminMpNewsletterClient
      subscribers={subscribers}
      missingMps={missingMps}
      campaigns={campaigns.map(campaign => ({
        id: campaign.id,
        subject: campaign.subject,
        recipientMode: campaign.recipientMode,
        totalRecipients: campaign.totalRecipients,
        sentCount: campaign.sentCount,
        failedCount: campaign.failedCount,
        sentAt: campaign.sentAt?.toISOString() ?? null,
        createdAt: campaign.createdAt.toISOString(),
      }))}
    />
  );
}
