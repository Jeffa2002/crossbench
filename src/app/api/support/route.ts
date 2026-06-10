import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, rateLimitKey } from '@/lib/rate-limit';
import { generateSupportAiReply } from '@/lib/support-ai';

async function sendTelegramNotification(ticket: { id: string; email: string; name: string | null; subject: string; message: string }) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (!token || !chatId) return;

  const preview = ticket.message.slice(0, 200) + (ticket.message.length > 200 ? '…' : '');
  const text = `🎫 *New Support Ticket*\n\n*From:* ${ticket.name || 'Anonymous'} (${ticket.email})\n*Subject:* ${ticket.subject}\n\n${preview}\n\n[View tickets](https://crossbench.io/admin/support)`;

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown', disable_web_page_preview: true }),
  });
}

// POST /api/support — submit a ticket
export async function POST(req: NextRequest) {
  const session = await auth();
  const { email, name, subject, message } = await req.json().catch(() => ({}));

  if (typeof email !== 'string' || typeof subject !== 'string' || typeof message !== 'string' || !email.trim() || !subject.trim() || !message.trim()) {
    return NextResponse.json({ error: 'Email, subject and message are required' }, { status: 400 });
  }

  const userId = (session?.user as any)?.id ?? null;

  // Auto-fill email/name from session if logged in
  const finalEmail = (email || session?.user?.email || '').trim().slice(0, 254);
  const finalName = typeof name === 'string' && name.trim() ? name.trim().slice(0, 120) : session?.user?.name || null;
  const finalSubject = subject.trim().slice(0, 160);
  const finalMessage = message.trim().slice(0, 4000);
  const ipLimit = checkRateLimit(rateLimitKey(req, 'support-ticket'), 3, 10 * 60_000);
  const emailLimit = checkRateLimit(`support-ticket-email:${finalEmail.toLowerCase()}`, 5, 60 * 60_000);
  if (!ipLimit.ok || !emailLimit.ok) {
    return NextResponse.json(
      { error: 'Too many support tickets. Please wait and try again.' },
      { status: 429, headers: { 'Retry-After': String(Math.max(ipLimit.retryAfter, emailLimit.retryAfter)) } }
    );
  }

  // Create ticket
  const ticket = await prisma.supportTicket.create({
    data: {
      userId,
      email: finalEmail,
      name: finalName,
      subject: finalSubject,
      message: finalMessage,
    },
  });

  // Fire off AI reply generation + Telegram notification in parallel (non-blocking)
  Promise.all([
    generateSupportAiReply(finalSubject, finalMessage).then(async (aiReply) => {
      if (aiReply) {
        await prisma.supportTicket.update({
          where: { id: ticket.id },
          data: { aiSuggestedReply: aiReply },
        });
      }
    }),
    sendTelegramNotification(ticket),
  ]).catch(console.error);

  return NextResponse.json({ ok: true, ticketId: ticket.id });
}
