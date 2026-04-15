import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) return null;
  const user = await prisma.user.findUnique({ where: { id: (session.user as any).id }, select: { role: true, email: true } });
  return user?.role === 'ADMIN' ? { session, email: user.email } : null;
}

// PATCH /api/admin/support/[id] — update status/priority or add reply
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  // Update status/priority
  if (body.status || body.priority) {
    const ticket = await prisma.supportTicket.update({
      where: { id },
      data: {
        ...(body.status && { status: body.status }),
        ...(body.priority && { priority: body.priority }),
      },
      include: { replies: { orderBy: { createdAt: 'asc' } } },
    });
    return NextResponse.json(ticket);
  }

  // Add admin reply
  if (body.message) {
    await prisma.supportReply.create({
      data: {
        ticketId: id,
        authorEmail: admin.email!,
        isAdmin: true,
        isAi: false,
        message: body.message,
      },
    });

    // Move to IN_PROGRESS if still OPEN
    await prisma.supportTicket.updateMany({
      where: { id, status: 'OPEN' },
      data: { status: 'IN_PROGRESS' },
    });

    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      include: { replies: { orderBy: { createdAt: 'asc' } } },
    });
    return NextResponse.json(ticket);
  }

  return NextResponse.json({ error: 'No action' }, { status: 400 });
}
