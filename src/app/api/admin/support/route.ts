import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) return null;
  const user = await prisma.user.findUnique({ where: { id: (session.user as any).id }, select: { role: true } });
  return user?.role === 'ADMIN' ? session : null;
}

// GET /api/admin/support — list tickets
export async function GET(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const status = req.nextUrl.searchParams.get('status');
  const tickets = await prisma.supportTicket.findMany({
    where: status ? { status: status as any } : undefined,
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    include: { replies: { orderBy: { createdAt: 'asc' } }, user: { select: { email: true, name: true, role: true } } },
  });

  return NextResponse.json(tickets);
}
