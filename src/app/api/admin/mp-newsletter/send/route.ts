import { Buffer } from 'buffer';
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { requireAdminAccess } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;
const MAX_ATTACHMENT_COUNT = 6;

type Recipient = {
  id: string | null;
  email: string;
  unsubscribeToken: string | null;
};

function normalizeEmail(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function isLikelyEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function textToHtml(text: string) {
  return text
    .trim()
    .split(/\n{2,}/)
    .map(paragraph => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
    .join('\n');
}

function publicBaseUrl(req: NextRequest) {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || new URL(req.url).origin;
}

function unsubscribeUrl(baseUrl: string, token: string | null) {
  if (!token) return `${baseUrl}/mp-updates`;
  return `${baseUrl}/mp-updates/unsubscribe?token=${encodeURIComponent(token)}`;
}

function renderText(text: string, url: string) {
  const withLink = text.includes('{{unsubscribeUrl}}') ? text.replaceAll('{{unsubscribeUrl}}', url) : text;
  return `${withLink.trim()}\n\n--\nCrossbench MP Updates\nUnsubscribe: ${url}`;
}

function renderHtml(html: string | null, text: string, url: string) {
  const body = html?.trim() ? html.trim() : textToHtml(text);
  const withLink = body.includes('{{unsubscribeUrl}}') ? body.replaceAll('{{unsubscribeUrl}}', url) : body;
  return `
    <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.6; font-size: 15px;">
      ${withLink}
      <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 28px 0 16px;" />
      <p style="font-size: 12px; color: #6b7280;">
        Crossbench MP Updates<br />
        <a href="${escapeHtml(url)}" style="color: #2563eb;">Unsubscribe</a>
      </p>
    </div>
  `;
}

async function parseAttachments(form: FormData) {
  const files = form.getAll('attachments').filter((item): item is File => item instanceof File && item.size > 0);
  if (files.length > MAX_ATTACHMENT_COUNT) throw new Error(`Attach up to ${MAX_ATTACHMENT_COUNT} files.`);

  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  if (totalBytes > MAX_ATTACHMENT_BYTES) throw new Error('Attachments must be 20MB or less in total.');

  return Promise.all(files.map(async file => ({
    filename: file.name,
    content: Buffer.from(await file.arrayBuffer()),
    contentType: file.type || undefined,
  })));
}

async function recipientsForMode(mode: string, testEmail: string): Promise<Recipient[]> {
  if (mode === 'test') {
    if (!isLikelyEmail(testEmail)) throw new Error('Enter a valid test recipient email.');
    return [{ id: null, email: testEmail, unsubscribeToken: null }];
  }

  const subscribers = await prisma.mpNewsletterSubscription.findMany({
    where: { active: true },
    orderBy: { subscribedAt: 'asc' },
    select: { id: true, email: true, unsubscribeToken: true },
  });
  return subscribers;
}

export async function POST(req: NextRequest) {
  const admin = await requireAdminAccess();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'RESEND_API_KEY is not configured.' }, { status: 500 });

  const form = await req.formData();
  const subject = String(form.get('subject') || '').trim().slice(0, 200);
  const textBody = String(form.get('textBody') || '').trim();
  const htmlBody = String(form.get('htmlBody') || '').trim();
  const recipientMode = String(form.get('recipientMode') || 'active') === 'test' ? 'test' : 'active';
  const testEmail = normalizeEmail(form.get('testEmail'));

  if (!subject) return NextResponse.json({ error: 'Subject is required.' }, { status: 400 });
  if (!textBody) return NextResponse.json({ error: 'Plain text body is required.' }, { status: 400 });

  let attachments;
  try {
    attachments = await parseAttachments(form);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid attachments.' }, { status: 400 });
  }

  let recipients: Recipient[];
  try {
    recipients = await recipientsForMode(recipientMode, testEmail);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid recipient settings.' }, { status: 400 });
  }

  if (recipients.length === 0) {
    return NextResponse.json({ error: 'There are no active MP newsletter subscribers.' }, { status: 400 });
  }

  const campaign = await prisma.mpNewsletterCampaign.create({
    data: {
      subject,
      textBody,
      htmlBody: htmlBody || null,
      sentBy: admin.email,
      recipientMode,
      attachmentNames: attachments.length ? JSON.stringify(attachments.map(attachment => attachment.filename)) : null,
      totalRecipients: recipients.length,
    },
  });

  const resend = new Resend(apiKey);
  const baseUrl = publicBaseUrl(req);
  const from = process.env.MP_NEWSLETTER_FROM || process.env.MP_OUTREACH_FROM || 'Crossbench <noreply@crossbench.io>';
  let sentCount = 0;
  let failedCount = 0;

  for (const recipient of recipients) {
    const url = unsubscribeUrl(baseUrl, recipient.unsubscribeToken);
    try {
      const { data, error } = await resend.emails.send({
        from,
        to: recipient.email,
        subject,
        text: renderText(textBody, url),
        html: renderHtml(htmlBody || null, textBody, url),
        attachments: attachments.length ? attachments : undefined,
        headers: {
          'X-Crossbench-Newsletter': 'mp-updates',
          'X-Crossbench-Campaign-ID': campaign.id,
        },
        tags: [
          { name: 'newsletter', value: 'mp_updates' },
          { name: 'mode', value: recipientMode },
        ],
      });

      if (error) throw new Error(error.message);
      sentCount += 1;
      await prisma.mpNewsletterDelivery.create({
        data: {
          campaignId: campaign.id,
          subscriptionId: recipient.id,
          email: recipient.email,
          status: 'SENT',
          resendId: data?.id ?? null,
          sentAt: new Date(),
        },
      });
    } catch (error) {
      failedCount += 1;
      await prisma.mpNewsletterDelivery.create({
        data: {
          campaignId: campaign.id,
          subscriptionId: recipient.id,
          email: recipient.email,
          status: 'FAILED',
          error: error instanceof Error ? error.message : 'Unknown send error',
        },
      });
    }
  }

  await prisma.mpNewsletterCampaign.update({
    where: { id: campaign.id },
    data: { sentCount, failedCount, sentAt: new Date() },
  });

  return NextResponse.json({
    ok: failedCount === 0,
    campaignId: campaign.id,
    totalRecipients: recipients.length,
    sentCount,
    failedCount,
  }, { status: failedCount === 0 ? 200 : 207 });
}
