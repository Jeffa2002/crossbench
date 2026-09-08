import type { PrismaClient } from '@prisma/client';
import type { MediaSendDependencies } from './media-send';

export function createMediaSendStore(prisma: PrismaClient): Pick<MediaSendDependencies, 'previous' | 'claim' | 'record'> {
  return {
    previous: email => prisma.outreachEmailLog.findFirst({
      where: { recipientEmail: { equals: email, mode: 'insensitive' }, OR: [{ chamber: 'Media' }, { campaign: { startsWith: 'media_' } }] },
      orderBy: [{ sentAt: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }],
      select: { id: true, status: true, sentAt: true, sentBy: true },
    }),
    claim: data => prisma.outreachEmailLog.create({ data: { ...data, status: 'PENDING' } }),
    record: async (id, status, providerId) => {
      const result = await prisma.outreachEmailLog.updateMany({ where: { id, status: 'PENDING' }, data: { status, ...(providerId ? { resendId: providerId, sentAt: new Date() } : {}), error: status === 'SENT' ? null : status === 'FAILED' ? 'Provider rejected; manual review required' : 'Outcome uncertain; do not retry' } });
      if (status === 'SENT' && result.count !== 1) throw new Error('Delivery acknowledgement could not be recorded');
    },
  };
}
