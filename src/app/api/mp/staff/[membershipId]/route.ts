import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getManageableOfficeMembership, logOfficeAuditEvent } from '@/lib/mp-office';

function canManageTarget(actor: { userId: string; role: string }, target: { role: string; userId: string; invitedByUserId: string | null }) {
  if (target.role === 'PRINCIPAL') return false;
  if (target.userId === actor.userId) return false;
  if (actor.role === 'PRINCIPAL') return true;
  return target.role === 'STAFFER' && target.invitedByUserId === actor.userId;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ membershipId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const manager = await getManageableOfficeMembership((session.user as any).id);
  if (!manager) return NextResponse.json({ error: 'Office admin access required' }, { status: 403 });

  const { membershipId } = await params;
  const target = await prisma.officeMembership.findUnique({
    where: { id: membershipId },
    include: { user: { select: { id: true, email: true } } },
  });
  if (!target || target.electorateId !== manager.electorateId) {
    return NextResponse.json({ error: 'Staff account not found.' }, { status: 404 });
  }
  if (!canManageTarget({ userId: (session.user as any).id, role: manager.role }, target)) {
    return NextResponse.json({ error: 'You cannot manage this staff account.' }, { status: 403 });
  }

  const body = await req.json();
  const action = typeof body.action === 'string' ? body.action : '';
  const now = new Date();

  let data: any;
  let auditAction: string;

  if (action === 'block') {
    data = { status: 'BLOCKED', blockedAt: now, removedAt: null };
    auditAction = 'staff_blocked';
  } else if (action === 'unblock') {
    data = { status: 'ACTIVE', blockedAt: null, removedAt: null };
    auditAction = 'staff_unblocked';
  } else if (action === 'remove') {
    data = { status: 'REMOVED', removedAt: now };
    auditAction = 'staff_removed';
  } else if (action === 'role') {
    if (manager.role !== 'PRINCIPAL') {
      return NextResponse.json({ error: 'Only the principal can change staff roles.' }, { status: 403 });
    }
    const nextRole = body.role === 'OFFICE_ADMIN' ? 'OFFICE_ADMIN' : 'STAFFER';
    data = { role: nextRole };
    auditAction = 'staff_role_changed';
  } else {
    return NextResponse.json({ error: 'Unknown staff action.' }, { status: 400 });
  }

  const membership = await prisma.officeMembership.update({
    where: { id: membershipId },
    data,
    include: { user: { select: { id: true, email: true, name: true, emailVerified: true } } },
  });

  await logOfficeAuditEvent({
    electorateId: manager.electorateId,
    actorUserId: (session.user as any).id,
    targetUserId: membership.userId,
    targetEmail: membership.user.email,
    action: auditAction,
    metadata: { role: membership.role, status: membership.status },
  });

  return NextResponse.json({ ok: true, membership });
}
