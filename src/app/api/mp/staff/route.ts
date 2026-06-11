import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { auth } from '@/lib/auth';
import { appUrl } from '@/lib/app-url';
import { prisma } from '@/lib/prisma';
import {
  generateInviteToken,
  getManageableOfficeMembership,
  hashInviteToken,
  isAphEmail,
  logOfficeAuditEvent,
  normalizeEmail,
  publicOfficeRole,
} from '@/lib/mp-office';

function cleanName(value: unknown) {
  return typeof value === 'string' ? value.trim().slice(0, 120) : '';
}

function roleFromInput(value: unknown, actorRole: string) {
  const role = value === 'OFFICE_ADMIN' ? 'OFFICE_ADMIN' : 'STAFFER';
  return actorRole === 'PRINCIPAL' ? role : 'STAFFER';
}

function inviteEmailHtml(input: { officeName: string; inviterEmail: string; inviteUrl: string; role: string }) {
  return `
    <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.6; font-size: 15px;">
      <p>You have been invited to join the ${input.officeName} office on Crossbench as ${input.role}.</p>
      <p>Use your APH email address to accept the invite and access the office dashboard.</p>
      <p><a href="${input.inviteUrl}" style="display: inline-block; background: #166534; color: #ffffff; padding: 12px 16px; border-radius: 8px; text-decoration: none; font-weight: 700;">Accept invite</a></p>
      <p style="font-size: 12px; color: #6b7280;">Invited by ${input.inviterEmail}. This invite expires in 14 days.</p>
    </div>
  `;
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const manager = await getManageableOfficeMembership((session.user as any).id);
  if (!manager) return NextResponse.json({ error: 'Office admin access required' }, { status: 403 });

  const [memberships, invites, auditEvents] = await Promise.all([
    prisma.officeMembership.findMany({
      where: { electorateId: manager.electorateId },
      include: {
        user: { select: { id: true, email: true, name: true, emailVerified: true } },
        invitedBy: { select: { id: true, email: true, name: true } },
      },
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.officeInvite.findMany({
      where: { electorateId: manager.electorateId, status: 'PENDING' },
      include: { invitedBy: { select: { id: true, email: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.officeAuditEvent.findMany({
      where: { electorateId: manager.electorateId },
      include: { actor: { select: { email: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
  ]);

  return NextResponse.json({
    office: {
      electorateId: manager.electorateId,
      name: manager.electorate.name,
      state: manager.electorate.state,
      role: manager.role,
      canInviteAdmins: manager.role === 'PRINCIPAL',
    },
    memberships: memberships.map(membership => ({
      id: membership.id,
      role: membership.role,
      status: membership.status,
      createdAt: membership.createdAt.toISOString(),
      removedAt: membership.removedAt?.toISOString() ?? null,
      blockedAt: membership.blockedAt?.toISOString() ?? null,
      user: membership.user,
      invitedBy: membership.invitedBy,
      canManage:
        manager.role === 'PRINCIPAL'
        || (membership.role === 'STAFFER' && membership.invitedByUserId === (session.user as any).id),
    })),
    invites: invites.map(invite => ({
      id: invite.id,
      email: invite.email,
      name: invite.name,
      role: invite.role,
      expiresAt: invite.expiresAt.toISOString(),
      createdAt: invite.createdAt.toISOString(),
      invitedBy: invite.invitedBy,
    })),
    auditEvents: auditEvents.map(event => ({
      id: event.id,
      action: event.action,
      targetEmail: event.targetEmail,
      createdAt: event.createdAt.toISOString(),
      actor: event.actor,
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const manager = await getManageableOfficeMembership((session.user as any).id);
  if (!manager) return NextResponse.json({ error: 'Office admin access required' }, { status: 403 });

  const body = await req.json();
  const email = normalizeEmail(body.email);
  const name = cleanName(body.name) || null;
  const role = roleFromInput(body.role, manager.role);

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
  }
  if (!isAphEmail(email)) {
    return NextResponse.json({ error: 'Only @aph.gov.au accounts can be invited.' }, { status: 400 });
  }
  if (manager.electorate.mpEmail?.toLowerCase() === email) {
    return NextResponse.json({ error: 'The principal MP or Senator is already the office owner.' }, { status: 400 });
  }

  const existingUser = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true, name: true } });
  if (existingUser) {
    const membership = await prisma.officeMembership.upsert({
      where: { electorateId_userId: { electorateId: manager.electorateId, userId: existingUser.id } },
      create: {
        electorateId: manager.electorateId,
        userId: existingUser.id,
        role,
        status: 'ACTIVE',
        invitedByUserId: (session.user as any).id,
      },
      update: {
        role,
        status: 'ACTIVE',
        removedAt: null,
        blockedAt: null,
        invitedByUserId: (session.user as any).id,
      },
    });

    await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        role: 'MP',
        electorateId: manager.electorateId,
        subscriptionStatus: 'ACTIVE',
        subscriptionTier: 'PRO',
        trialEndsAt: null,
      } as any,
    });
    await logOfficeAuditEvent({
      electorateId: manager.electorateId,
      actorUserId: (session.user as any).id,
      targetUserId: existingUser.id,
      targetEmail: email,
      action: 'staff_added',
      metadata: { role },
    });

    return NextResponse.json({ ok: true, membershipId: membership.id, alreadyHadAccount: true });
  }

  const token = generateInviteToken();
  const tokenHash = hashInviteToken(token);
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

  await prisma.officeInvite.updateMany({
    where: { electorateId: manager.electorateId, email, status: 'PENDING' },
    data: { status: 'REVOKED', revokedAt: new Date() },
  });

  const invite = await prisma.officeInvite.create({
    data: {
      electorateId: manager.electorateId,
      email,
      name,
      role,
      tokenHash,
      invitedByUserId: (session.user as any).id,
      expiresAt,
    },
  });

  const inviteUrl = appUrl(`/mp-dashboard/staff/accept?token=${encodeURIComponent(token)}`);
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    const resend = new Resend(resendKey);
    const officeName = `${manager.electorate.name}, ${manager.electorate.state}`;
    await resend.emails.send({
      from: process.env.MP_OFFICE_INVITE_FROM || process.env.MP_OUTREACH_FROM || 'Crossbench <noreply@crossbench.io>',
      to: email,
      replyTo: (session.user as any).email,
      subject: `Invitation to join the ${manager.electorate.name} Crossbench office`,
      text: [
        `You have been invited to join the ${officeName} office on Crossbench as ${publicOfficeRole(role)}.`,
        'Use your APH email address to accept the invite:',
        inviteUrl,
        '',
        `Invited by ${(session.user as any).email}. This invite expires in 14 days.`,
      ].join('\n'),
      html: inviteEmailHtml({
        officeName,
        inviterEmail: (session.user as any).email,
        inviteUrl,
        role: publicOfficeRole(role),
      }),
    });
  }

  await logOfficeAuditEvent({
    electorateId: manager.electorateId,
    actorUserId: (session.user as any).id,
    targetEmail: email,
    action: 'staff_invited',
    metadata: { role, inviteId: invite.id, emailSent: Boolean(resendKey) },
  });

  return NextResponse.json({ ok: true, inviteId: invite.id, emailSent: Boolean(resendKey) });
}
