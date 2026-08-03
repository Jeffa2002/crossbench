import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminAccess } from '@/lib/admin-auth';
import { sendSupportTicketReply } from '@/lib/support-email';
import { Buffer } from 'buffer';

const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;
const MAX_ATTACHMENT_COUNT = 6;

async function parseReply(req: NextRequest) {
  const contentType = req.headers.get('content-type') || '';
  if (!contentType.includes('multipart/form-data')) {
    const body = await req.json();
    return { body, attachments: [] as { filename: string; content: Buffer; contentType?: string }[] };
  }

  const form = await req.formData();
  const files = form.getAll('attachments').filter((item): item is File => item instanceof File && item.size > 0);
  if (files.length > MAX_ATTACHMENT_COUNT) throw new Error(`Attach up to ${MAX_ATTACHMENT_COUNT} files.`);
  if (files.reduce((sum, file) => sum + file.size, 0) > MAX_ATTACHMENT_BYTES) {
    throw new Error('Attachments must be 20MB or less in total.');
  }

  return {
    body: { message: String(form.get('message') || '') },
    attachments: await Promise.all(files.map(async file => ({
      filename: file.name,
      content: Buffer.from(await file.arrayBuffer()),
      contentType: file.type || undefined,
    }))),
  };
}

// PATCH /api/admin/support/[id] — update status/priority or add reply
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminAccess();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  let parsed;
  try {
    parsed = await parseReply(req);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid reply.' }, { status: 400 });
  }
  const { body, attachments } = parsed;

  // Update status/priority
  if (body.status || body.priority) {
    const ticket = await prisma.supportTicket.update({
      where: { id },
      data: {
        ...(body.status && { status: body.status }),
        ...(body.priority && { priority: body.priority }),
      },
      include: { replies: { orderBy: { createdAt: 'desc' } } },
    });
    return NextResponse.json(ticket);
  }

  // Add admin reply
  if (body.message) {
    const message = String(body.message).trim().slice(0, 4000);
    if (!message) return NextResponse.json({ error: 'Reply message is required' }, { status: 400 });

    const ticketBeforeReply = await prisma.supportTicket.findUnique({ where: { id } });
    if (!ticketBeforeReply) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });

    const reply = await prisma.supportReply.create({
      data: {
        ticketId: id,
        authorEmail: admin.email!,
        isAdmin: true,
        isAi: false,
        message,
        attachmentNames: attachments.length ? JSON.stringify(attachments.map(attachment => attachment.filename)) : null,
      },
    });

    let emailStatus = { sent: false, resendId: null as string | null, error: null as string | null };
    try {
      const resendId = await sendSupportTicketReply(ticketBeforeReply, message, admin.email!, attachments);
      await prisma.supportReply.update({
        where: { id: reply.id },
        data: { resendId, emailSentAt: new Date(), emailError: null },
      });
      emailStatus = { sent: true, resendId, error: null };

      await prisma.supportTicket.update({
        where: { id },
        data: ticketBeforeReply.status === 'OPEN' ? { status: 'IN_PROGRESS' } : { updatedAt: new Date() },
      });
    } catch (error) {
      const emailError = error instanceof Error ? error.message : 'Unable to send reply email';
      await prisma.supportReply.update({
        where: { id: reply.id },
        data: { emailError },
      });
      await prisma.supportTicket.update({
        where: { id },
        data: { updatedAt: new Date() },
      });
      emailStatus = { sent: false, resendId: null, error: emailError };
    }

    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      include: { replies: { orderBy: { createdAt: 'desc' } } },
    });
    return NextResponse.json({ ticket, email: emailStatus }, { status: emailStatus.sent ? 200 : 502 });
  }

  return NextResponse.json({ error: 'No action' }, { status: 400 });
}
