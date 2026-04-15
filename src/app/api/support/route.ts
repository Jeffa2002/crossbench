import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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
  const session = await auth();
  const { email, name, subject, message } = await req.json();

  if (!email || !subject || !message) {
    return NextResponse.json({ error: 'Email, subject and message are required' }, { status: 400 });
  }

  const userId = (session?.user as any)?.id ?? null;

  // Auto-fill email/name from session if logged in
  const finalEmail = email || session?.user?.email || '';
  const finalName = name || session?.user?.name || null;

  // Create ticket
  const ticket = await prisma.supportTicket.create({
    data: {
      userId,
      email: finalEmail,
      name: finalName,
      subject,
      message,
    },
  });

  // Fire off AI reply generation + Telegram notification in parallel (non-blocking)
  Promise.all([
    generateAiReply(subject, message).then(async (aiReply) => {
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
