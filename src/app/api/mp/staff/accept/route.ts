import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hashInviteToken, isAphEmail, logOfficeAuditEvent, normalizeEmail } from '@/lib/mp-office';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Sign in with your APH email to accept this invite.' }, { status: 401 });
  }

  const { token } = await req.json();
  if (typeof token !== 'string' || token.length < 20) {
    return NextResponse.json({ error: 'Invalid invite token.' }, { status: 400 });
  }

  const email = normalizeEmail(session.user.email);
  if (!isAphEmail(email)) {
    return NextResponse.json({ error: 'Only @aph.gov.au accounts can accept office invites.' }, { status: 403 });
  }

  const invite = await prisma.officeInvite.findUnique({
    where: { tokenHash: hashInviteToken(token) },
    include: { electorate: true },
  });

  if (!invite || invite.status !== 'PENDING') {
    return NextResponse.json({ error: 'This invite is no longer active.' }, { status: 404 });
  }
  if (invite.expiresAt.getTime() < Date.now()) {
    await prisma.officeInvite.update({
      where: { id: invite.id },
      data: { status: 'EXPIRED' },
    });
    return NextResponse.json({ error: 'This invite has expired.' }, { status: 410 });
  }
  if (normalizeEmail(invite.email) !== email) {
    return NextResponse.json({ error: `This invite is for ${invite.email}. Sign in with that APH account to accept it.` }, { status: 403 });
  }

  const userId = (session.user as any).id;
  const membership = await prisma.officeMembership.upsert({
    where: { electorateId_userId: { electorateId: invite.electorateId, userId } },
    create: {
      electorateId: invite.electorateId,
      userId,
      role: invite.role,
      status: 'ACTIVE',
      invitedByUserId: invite.invitedByUserId,
    },
    update: {
      role: invite.role,
      status: 'ACTIVE',
      invitedByUserId: invite.invitedByUserId,
      removedAt: null,
      blockedAt: null,
    },
  });

  await prisma.user.update({
    where: { id: userId },
    data: {
      role: 'MP',
      electorateId: invite.electorateId,
      subscriptionStatus: 'ACTIVE',
      subscriptionTier: 'PRO',
      trialEndsAt: null,
    } as any,
  });

  await prisma.officeInvite.update({
    where: { id: invite.id },
    data: {
      status: 'ACCEPTED',
      acceptedByUserId: userId,
      acceptedAt: new Date(),
    },
  });

  await logOfficeAuditEvent({
    electorateId: invite.electorateId,
    actorUserId: userId,
    targetUserId: userId,
    targetEmail: email,
    action: 'staff_invite_accepted',
    metadata: { role: invite.role, inviteId: invite.id, membershipId: membership.id },
  });

  return NextResponse.json({
    ok: true,
    office: { name: invite.electorate.name, state: invite.electorate.state },
    membershipId: membership.id,
  });
}
