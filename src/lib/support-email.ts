import { Resend } from 'resend';

type TicketForReply = {
  id: string;
  email: string;
  name: string | null;
  subject: string;
  message: string;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function normalizeSubject(subject: string) {
  return /^re:/i.test(subject) ? subject : `Re: ${subject}`;
}

export function ticketReplyAddress(ticketId: string) {
  return `support+ticket-${ticketId}@crossbench.io`;
}

export async function sendSupportTicketReply(ticket: TicketForReply, message: string, authorEmail: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY is not configured');

  const resend = new Resend(apiKey);
  const from = process.env.SUPPORT_REPLY_FROM || process.env.MP_OUTREACH_FROM || 'Crossbench Support <noreply@crossbench.io>';
  const replyTo = ticketReplyAddress(ticket.id);
  const subject = normalizeSubject(ticket.subject);
  const text = [
    message.trim(),
    '',
    '--',
    'Crossbench Support',
    '',
    `Ticket: ${ticket.id}`,
  ].join('\n');
  const html = `
    <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.55; font-size: 15px;">
      ${message.trim().split(/\n{2,}/).map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`).join('')}
      <p style="margin-top: 24px; color: #4b5563;">--<br>Crossbench Support</p>
      <p style="font-size: 12px; color: #6b7280;">Ticket: ${escapeHtml(ticket.id)}</p>
    </div>
  `;

  const { data, error } = await resend.emails.send({
    from,
    to: ticket.email,
    replyTo,
    subject,
    text,
    html,
    headers: {
      'X-Crossbench-Ticket-ID': ticket.id,
      'X-Crossbench-Support-Author': authorEmail,
    },
    tags: [
      { name: 'support', value: 'ticket_reply' },
      { name: 'ticket', value: ticket.id },
    ],
  });

  if (error) throw new Error(error.message);
  return data?.id ?? null;
}
