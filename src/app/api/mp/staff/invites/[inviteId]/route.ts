import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getManageableOfficeMembership, logOfficeAuditEvent } from '@/lib/mp-office';

export async function DELETE(_: Request, { params }: { params: Promise<{ inviteId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const manager = await getManageableOfficeMembership((session.user as any).id);
  if (!manager) return NextResponse.json({ error: 'Office admin access required' }, { status: 403 });

  const { inviteId } = await params;
  const invite = await prisma.officeInvite.findUnique({ where: { id: inviteId } });
  if (!invite || invite.electorateId !== manager.electorateId || invite.status !== 'PENDING') {
    return NextResponse.json({ error: 'Invite not found.' }, { status: 404 });
  }
  if (manager.role !== 'PRINCIPAL' && invite.invitedByUserId !== (session.user as any).id) {
    return NextResponse.json({ error: 'You can only revoke invites you created.' }, { status: 403 });
  }

  await prisma.officeInvite.update({
    where: { id: invite.id },
    data: { status: 'REVOKED', revokedAt: new Date() },
  });

  await logOfficeAuditEvent({
    electorateId: manager.electorateId,
    actorUserId: (session.user as any).id,
    targetEmail: invite.email,
    action: 'staff_invite_revoked',
    metadata: { inviteId: invite.id, role: invite.role },
  });

  return NextResponse.json({ ok: true });
}
