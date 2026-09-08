import { Resend } from 'resend';
import { requireAdminAccess } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';
import { createMediaSendHandlers } from '@/lib/media-send';
import { createMediaSendStore } from '@/lib/media-send-store';

export const dynamic = 'force-dynamic';

const handlers = createMediaSendHandlers({
  ...createMediaSendStore(prisma),
  admin: requireAdminAccess,
  configuration: () => ({
    ready: Boolean(process.env.RESEND_API_KEY),
    from: process.env.MEDIA_OUTREACH_FROM || process.env.MP_OUTREACH_FROM || 'Crossbench <noreply@crossbench.io>',
    replyTo: process.env.MEDIA_OUTREACH_REPLY_TO || 'support+media@crossbench.io',
  }),
  deliver: async (mail, idempotencyKey) => {
    const result = await new Resend(process.env.RESEND_API_KEY).emails.send(mail, { idempotencyKey });
    if (result.error) {
      const status = result.error.statusCode ?? 0;
      return { rejected: status >= 400 && status < 500 && status !== 408 };
    }
    return { id: result.data?.id };
  },
});

export const GET = handlers.GET;
export const POST = handlers.POST;
