import { createHash, randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';

export const OFFICE_MANAGEMENT_ROLES = ['PRINCIPAL', 'OFFICE_ADMIN'] as const;
export const OFFICE_ROLES = ['OFFICE_ADMIN', 'STAFFER'] as const;

type OfficeRole = 'PRINCIPAL' | 'OFFICE_ADMIN' | 'STAFFER';

export function normalizeEmail(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export function isAphEmail(email: string) {
  return normalizeEmail(email).endsWith('@aph.gov.au');
}

export function isOfficeManager(role: string | null | undefined) {
  return role === 'PRINCIPAL' || role === 'OFFICE_ADMIN';
}

export function generateInviteToken() {
  return randomBytes(32).toString('base64url');
}

export function hashInviteToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export function publicOfficeRole(role: string) {
  if (role === 'PRINCIPAL') return 'Principal';
  if (role === 'OFFICE_ADMIN') return 'Office admin';
  return 'Staffer';
}

export async function ensurePrincipalOfficeMembership(user: { id?: string | null; email?: string | null }) {
  if (!user.id || !user.email || !isAphEmail(user.email)) return null;

  const electorate = await prisma.electorate.findFirst({
    where: { mpEmail: { equals: user.email, mode: 'insensitive' } },
    select: { id: true },
  });
  if (!electorate) return null;

  const membership = await prisma.officeMembership.upsert({
    where: { electorateId_userId: { electorateId: electorate.id, userId: user.id } },
    create: {
      electorateId: electorate.id,
      userId: user.id,
      role: 'PRINCIPAL',
      status: 'ACTIVE',
    },
    update: {
      role: 'PRINCIPAL',
      status: 'ACTIVE',
      removedAt: null,
      blockedAt: null,
    },
    include: { electorate: true },
  });

  return membership;
}

export async function getActiveOfficeMembership(userId: string) {
  const memberships = await prisma.officeMembership.findMany({
    where: { userId, status: 'ACTIVE' },
    include: { electorate: true },
    orderBy: { createdAt: 'asc' },
  });

  const rank: Record<OfficeRole, number> = { PRINCIPAL: 0, OFFICE_ADMIN: 1, STAFFER: 2 };
  return memberships.sort((a, b) => rank[a.role as OfficeRole] - rank[b.role as OfficeRole])[0] ?? null;
}

export async function getManageableOfficeMembership(userId: string) {
  const membership = await getActiveOfficeMembership(userId);
  return membership && isOfficeManager(membership.role) ? membership : null;
}

export async function logOfficeAuditEvent(input: {
  electorateId: string;
  actorUserId?: string | null;
  targetUserId?: string | null;
  targetEmail?: string | null;
  action: string;
  metadata?: unknown;
}) {
  await prisma.officeAuditEvent.create({
    data: {
      electorateId: input.electorateId,
      actorUserId: input.actorUserId ?? null,
      targetUserId: input.targetUserId ?? null,
      targetEmail: input.targetEmail ? normalizeEmail(input.targetEmail) : null,
      action: input.action,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
    },
  });
}
