import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminAccess } from '@/lib/admin-auth';

// GET /api/admin/support — list tickets
export async function GET(req: NextRequest) {
  if (!await requireAdminAccess()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const status = req.nextUrl.searchParams.get('status');
  const tickets = await prisma.supportTicket.findMany({
    where: status ? { status: status as any } : undefined,
    orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
    include: { replies: { orderBy: { createdAt: 'desc' } }, user: { select: { email: true, name: true, role: true } } },
  });

  return NextResponse.json(tickets);
}
