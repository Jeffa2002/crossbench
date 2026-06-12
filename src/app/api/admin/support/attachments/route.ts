import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { requireAdminAccess } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

function hasAttachmentReference(message: string, emailId: string, attachmentId: string) {
  return message.includes(`Resend inbound email ID: ${emailId}`) && message.includes(`Resend attachment ID: ${attachmentId}`);
}

export async function GET(req: NextRequest) {
  const admin = await requireAdminAccess();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ticketId = req.nextUrl.searchParams.get('ticketId')?.trim();
  const emailId = req.nextUrl.searchParams.get('emailId')?.trim();
  const attachmentId = req.nextUrl.searchParams.get('attachmentId')?.trim();
  if (!ticketId || !emailId || !attachmentId) {
    return NextResponse.json({ error: 'Missing attachment reference' }, { status: 400 });
  }

  const ticket = await prisma.supportTicket.findUnique({
    where: { id: ticketId },
    select: {
      message: true,
      replies: { select: { message: true } },
    },
  });
  if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });

  const allowed = hasAttachmentReference(ticket.message, emailId, attachmentId)
    || ticket.replies.some(reply => hasAttachmentReference(reply.message, emailId, attachmentId));
  if (!allowed) return NextResponse.json({ error: 'Attachment is not linked to this ticket' }, { status: 403 });

  const apiKey = process.env.RESEND_RECEIVING_API_KEY || process.env.RESEND_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Resend inbound is not configured' }, { status: 503 });

  const resend = new Resend(apiKey);
  const attachment = await resend.emails.receiving.attachments.get({ emailId, id: attachmentId });
  if (attachment.error || !attachment.data?.download_url) {
    return NextResponse.json({ error: 'Unable to fetch attachment' }, { status: 502 });
  }

  return NextResponse.redirect(attachment.data.download_url);
}
