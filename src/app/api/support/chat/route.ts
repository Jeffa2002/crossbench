import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { checkRateLimit, rateLimitKey } from '@/lib/rate-limit';

let anthropicClient: Anthropic | null = null;

function getAnthropic(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not configured');
  }

  anthropicClient ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return anthropicClient;
}

const SYSTEM_PROMPT = `You are a helpful support assistant for Crossbench, an Australian civic platform.

About Crossbench:
- Citizens can sign up, verify their address/electorate, and vote on real federal bills
- MPs and Senators get free early access to live constituent sentiment dashboards for their electorate
- Magic-link email sign in (no passwords)
- Address verification confirms which electorate a user belongs to
- Voting requires address verification
- MP accounts are auto-detected by @aph.gov.au email addresses
- Paid MP office features may come later, but no credit card is required for core dashboard access during early access
- The platform is politically neutral — it shows data, not opinions

Your job: Answer support questions clearly and concisely. If something is a bug or you're unsure, tell the user to submit a ticket and the team will look into it. Keep replies short (2-4 sentences max). Don't make up features. Be warm and friendly.`;

type SupportChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

function parseMessages(value: unknown): SupportChatMessage[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;

  const messages = value.slice(-10).map((message): SupportChatMessage | null => {
    if (!message || typeof message !== 'object') return null;
    const role = (message as { role?: unknown }).role;
    const content = (message as { content?: unknown }).content;
    if ((role !== 'user' && role !== 'assistant') || typeof content !== 'string') return null;
    return { role, content: content.trim().slice(0, 1000) };
  });

  if (messages.some(message => !message || message.content.length === 0)) return null;
  return messages as SupportChatMessage[];
}

export async function POST(req: NextRequest) {
  const limited = checkRateLimit(rateLimitKey(req, 'support-chat'), 8, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: 'Too many chat requests. Please wait a minute and try again.' },
      { status: 429, headers: { 'Retry-After': String(limited.retryAfter) } }
    );
  }

  const { messages } = await req.json().catch(() => ({}));
  const history = parseMessages(messages);
  if (!history) return NextResponse.json({ error: 'Invalid messages' }, { status: 400 });

  try {
    const anthropic = getAnthropic();
    const res = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 400,
      system: SYSTEM_PROMPT,
      messages: history,
    });

    const text = (res.content[0] as any).text;
    return NextResponse.json({ reply: text });
  } catch (e) {
    console.error('[support chat]', e);
    return NextResponse.json({ error: 'AI unavailable' }, { status: 500 });
  }
}
