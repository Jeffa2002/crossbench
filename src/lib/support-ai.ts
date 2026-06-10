import Anthropic from '@anthropic-ai/sdk';

let anthropicClient: Anthropic | null = null;

function getAnthropic(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  anthropicClient ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return anthropicClient;
}

export async function generateSupportAiReply(subject: string, message: string): Promise<string> {
  const anthropic = getAnthropic();
  if (!anthropic) return '';

  try {
    const res = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `You are a helpful support agent for Crossbench, an Australian civic platform where citizens vote on federal bills and MPs see constituent sentiment data.

A support ticket or inbound email was received:
Subject: ${subject}
Message: ${message}

Write a friendly, helpful reply. Be concise (2-4 sentences). Don't make up specific features or timelines. If it's a bug, acknowledge it and say the team is looking into it. If it's a feature request or correction, thank them and say we will review it. If it's an automated acknowledgement or out-of-office reply, say no response is needed.`,
      }],
    });
    return (res.content[0] as any).text;
  } catch {
    return '';
  }
}
