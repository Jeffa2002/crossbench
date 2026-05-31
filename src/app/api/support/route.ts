import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Anthropic from '@anthropic-ai/sdk';

let anthropicClient: Anthropic | null = null;

function getAnthropic(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  anthropicClient ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return anthropicClient;
}

const TICKET_WINDOW_MS = 10 * 60_000;
const TICKET_MAX = 3;
const ticketRateLimit = new Map<string, { count: number; resetAt: number }>();

function clientKey(req: NextRequest): string {
  return req.headers.get('cf-connecting-ip')
    ?? req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? 'unknown';
}

function isRateLimited(req: NextRequest): boolean {
  const key = clientKey(req);
  const now = Date.now();
  const current = ticketRateLimit.get(key);

  if (!current || current.resetAt <= now) {
    ticketRateLimit.set(key, { count: 1, resetAt: now + TICKET_WINDOW_MS });
    return false;
  }

  current.count += 1;
  return current.count > TICKET_MAX;
}

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

async function generateAiReply(subject: string, message: string): Promise<string> {
  const anthropic = getAnthropic();
  if (!anthropic) return '';

  try {
    const res = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `You are a helpful support agent for Crossbench, an Australian civic platform where citizens vote on federal bills and MPs see constituent sentiment data.

A user submitted this support ticket:
Subject: ${subject}
Message: ${message}

Write a friendly, helpful reply. Be concise (2-4 sentences). Don't make up specific features or timelines. If it's a bug, acknowledge it and say the team is looking into it. If it's a feature request, thank them. If it's a question, answer it based on what you know about the platform.`,
      }],
    });
    return (res.content[0] as any).text;
  } catch {
    return '';
  }
}

// POST /api/support — submit a ticket
export async function POST(req: NextRequest) {
  if (isRateLimited(req)) {
    return NextResponse.json({ error: 'Too many support tickets. Please wait and try again.' }, { status: 429 });
  }

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
    generateAiReply(finalSubject, finalMessage).then(async (aiReply) => {
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
