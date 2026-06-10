import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { prisma } from '@/lib/prisma';

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

  const preview = ticket.message.slice(0, 200) + (ticket.message.length > 200 ? '...' : '');
  const text = `*New inbound email support ticket*\n\n*From:* ${ticket.name || 'Unknown'} (${ticket.email})\n*Subject:* ${ticket.subject}\n\n${preview}\n\n[View tickets](https://crossbench.io/admin/support)`;

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown', disable_web_page_preview: true }),
  });
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
  });
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
  const message = [
    `Inbound email reply received by Crossbench.`,
    ``,
    `From: ${email.from}`,
    `To: ${email.to.join(', ')}`,
    `Message-ID: ${email.message_id}`,
    `Resend inbound email ID: ${receivedEmailId}`,
    ``,
    body || '(No message body supplied by Resend.)',
  ].join('\n').slice(0, 4000);

  const ticket = await prisma.supportTicket.create({
    data: {
      email: fromEmail,
      name: fromName,
      subject: email.subject?.trim().slice(0, 160) || 'Inbound email reply',
      message,
      priority: 'NORMAL',
    },
  });

  sendTelegramNotification(ticket).catch(console.error);
  return NextResponse.json({ ok: true, ticketId: ticket.id });
}
