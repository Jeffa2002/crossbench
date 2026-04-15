import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a helpful support assistant for Crossbench, an Australian civic platform.

About Crossbench:
- Citizens can sign up, verify their address/electorate, and vote on real federal bills
- MPs and Senators can subscribe to see live constituent sentiment dashboards for their electorate
- Magic-link email sign in (no passwords)
- Address verification confirms which electorate a user belongs to
- Voting requires address verification
- MP accounts are auto-detected by @aph.gov.au email addresses
- MP plans: Pro ($199/mo) and Team ($499/mo AUD)
- The platform is politically neutral — it shows data, not opinions

Your job: Answer support questions clearly and concisely. If something is a bug or you're unsure, tell the user to submit a ticket and the team will look into it. Keep replies short (2-4 sentences max). Don't make up features. Be warm and friendly.`;

export async function POST(req: NextRequest) {
  const { messages } = await req.json();
  if (!messages?.length) return NextResponse.json({ error: 'No messages' }, { status: 400 });

  // Limit history to last 10 messages to keep costs low
  const history = messages.slice(-10).map((m: any) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }));

  try {
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
