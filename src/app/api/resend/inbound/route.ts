import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { prisma } from '@/lib/prisma';
import { generateSupportAiReply } from '@/lib/support-ai';
import { isClearlyAutomaticSupportReply } from '@/lib/support-auto-reply';

function cleanEmailAddress(value: string) {
  const match = value.match(/<([^>]+)>/);
  return (match?.[1] ?? value).trim().slice(0, 254);
}

function cleanDisplayName(value: string) {
  const beforeAddress = value.replace(/<[^>]+>/g, '').replace(/^"|"$/g, '').trim();
  return beforeAddress ? beforeAddress.slice(0, 120) : null;
}

async function sendTelegramNotification(ticket: { id: string; email: string; name: string | null; subject: string; message: string }) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (!token || !chatId) return;

  const preview = ticket.message.slice(0, 500) + (ticket.message.length > 500 ? '...' : '');
  const text = [
    'New inbound email support ticket',
    '',
    `Ticket: ${ticket.id}`,
    `From: ${ticket.name || 'Unknown'} (${ticket.email})`,
    `Subject: ${ticket.subject}`,
    '',
    preview,
    '',
    'View tickets: https://crossbench.io/admin/support',
  ].join('\n');

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
  });
}

function findThreadTicketId(addresses: string[]) {
  for (const address of addresses) {
    const match = address.match(/support\+ticket-([a-z0-9]+)@crossbench\.io/i);
    if (match?.[1]) return match[1];
  }
  return null;
}

function formatAttachmentSummary(attachments: Array<{ filename: string | null; size: number; content_type: string; id: string }>) {
  if (!attachments.length) return '';
  return [
    '',
    'Attachments:',
    ...attachments.map((attachment) => {
      const name = attachment.filename || 'unnamed attachment';
      return `- ${name} (${attachment.content_type}, ${attachment.size} bytes, Resend attachment ID: ${attachment.id})`;
    }),
  ].join('\n');
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.RESEND_RECEIVING_API_KEY || process.env.RESEND_API_KEY;
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  if (!apiKey || !webhookSecret) {
    return NextResponse.json({ error: 'Resend inbound is not configured' }, { status: 503 });
  }

  const payload = await req.text();
  const resend = new Resend(apiKey);

  let event: any;
  try {
    event = resend.webhooks.verify({
      payload,
      webhookSecret,
      headers: {
        id: req.headers.get('svix-id') ?? '',
        timestamp: req.headers.get('svix-timestamp') ?? '',
        signature: req.headers.get('svix-signature') ?? '',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
  }

  if (event.type !== 'email.received') {
    return NextResponse.json({ ok: true, ignored: event.type });
  }

  const emailId = event.data?.email_id;
  if (!emailId) {
    return NextResponse.json({ error: 'Missing inbound email id' }, { status: 400 });
  }

  const existing = await prisma.supportTicket.findFirst({
    where: { message: { contains: `Resend inbound email ID: ${emailId}` } },
    select: { id: true },
  }) ?? await prisma.supportReply.findFirst({
    where: { message: { contains: `Resend inbound email ID: ${emailId}` } },
    select: { ticketId: true },
  }).then((reply) => reply ? { id: reply.ticketId } : null);
  if (existing) return NextResponse.json({ ok: true, ticketId: existing.id, duplicate: true });

  const received = await resend.emails.receiving.get(emailId);
  if (received.error || !received.data) {
    return NextResponse.json({ error: 'Unable to fetch inbound email' }, { status: 502 });
  }

  const email = received.data;
  const receivedEmailId = email.id || emailId;
  const fromEmail = cleanEmailAddress(email.from);
  const fromName = cleanDisplayName(email.from);
  const body = (email.text || email.html || '').trim();
  const isAutoReply = isClearlyAutomaticSupportReply({ subject: email.subject, body });
  const attachmentSummary = formatAttachmentSummary(email.attachments || []);
  const threadTicketId = findThreadTicketId([
    ...(email.to || []),
    ...(email.cc || []),
    ...(email.bcc || []),
  ]);
  const message = [
    `Inbound email reply received by Crossbench.`,
    ``,
    `From: ${email.from}`,
    `To: ${email.to.join(', ')}`,
    email.cc?.length ? `Cc: ${email.cc.join(', ')}` : '',
    `Message-ID: ${email.message_id}`,
    `Resend inbound email ID: ${receivedEmailId}`,
    isAutoReply ? `Automatic reply detected: ticket closed automatically.` : '',
    ``,
    body || '(No message body supplied by Resend.)',
    attachmentSummary,
  ].filter(Boolean).join('\n').slice(0, 4000);

  if (threadTicketId) {
    const existingTicket = await prisma.supportTicket.findUnique({ where: { id: threadTicketId } });
    if (existingTicket) {
      await prisma.supportReply.create({
        data: {
          ticketId: existingTicket.id,
          authorEmail: fromEmail,
          isAdmin: false,
          isAi: false,
          message,
        },
      });

      await prisma.supportTicket.update({
        where: { id: existingTicket.id },
        data: { status: isAutoReply ? 'CLOSED' : 'OPEN' },
      });

      if (!isAutoReply) {
        generateSupportAiReply(existingTicket.subject, message).then(async (aiReply) => {
          if (aiReply) {
            await prisma.supportTicket.update({
              where: { id: existingTicket.id },
              data: { aiSuggestedReply: aiReply },
            });
          }
        }).catch(console.error);

        sendTelegramNotification({
          id: existingTicket.id,
          email: fromEmail,
          name: fromName,
          subject: `Reply: ${existingTicket.subject}`,
          message,
        }).catch(console.error);
      }

      return NextResponse.json({ ok: true, ticketId: existingTicket.id, threaded: true, autoClosed: isAutoReply });
    }
  }

  const ticket = await prisma.supportTicket.create({
    data: {
      email: fromEmail,
      name: fromName,
      subject: email.subject?.trim().slice(0, 160) || 'Inbound email reply',
      message,
      status: isAutoReply ? 'CLOSED' : 'OPEN',
      priority: isAutoReply ? 'LOW' : 'NORMAL',
    },
  });

  if (!isAutoReply) {
    generateSupportAiReply(ticket.subject, message).then(async (aiReply) => {
      if (aiReply) {
        await prisma.supportTicket.update({
          where: { id: ticket.id },
          data: { aiSuggestedReply: aiReply },
        });
      }
    }).catch(console.error);

    sendTelegramNotification(ticket).catch(console.error);
  }

  return NextResponse.json({ ok: true, ticketId: ticket.id, autoClosed: isAutoReply });
}
