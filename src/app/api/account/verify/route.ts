import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { readVerificationToken } from '@/lib/verification-token';

const MAX_FREE_CHANGES_PER_YEAR = 1;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { electorateId, verificationToken } = await req.json();
  const userId = (session.user as any).id;
  const verification = readVerificationToken(verificationToken, userId);
  if (!electorateId || !verification || verification.electorateId !== electorateId) {
    return NextResponse.json({ error: 'Invalid verification token' }, { status: 400 });
  }
  const electorate = await prisma.electorate.findUnique({ where: { id: electorateId } });
  if (!electorate) return NextResponse.json({ error: 'Invalid electorate' }, { status: 400 });

  // Fetch current user state
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { termsAcceptedAt: true, electorateId: true, verifiedAt: true },
  });

  const isChange = !!existing?.verifiedAt; // already verified = this is a change
  if (isChange) {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const changeCount = await prisma.addressChangeLog.count({
      where: { userId, createdAt: { gte: oneYearAgo } },
    });

    if (changeCount >= MAX_FREE_CHANGES_PER_YEAR) {
      return NextResponse.json({
        error: 'limit_reached',
        message: 'You have already changed your address once this year. Further changes require a support ticket for manual review.',
      }, { status: 429 });
    }
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        electorateId,
        verifiedAt: new Date(),
        addressHash: verification.addressHash,
        termsAcceptedAt: existing?.termsAcceptedAt ?? new Date(),
        verificationStatus: 'ADDRESS',
        electorateVerified: true,
        ...(isChange && { lastAddressChangeAt: new Date() }),
      },
    }),
    // Log address changes (not initial verifications)
    ...(isChange ? [prisma.addressChangeLog.create({
      data: {
        userId,
        fromElectorateId: existing?.electorateId ?? null,
        toElectorateId: electorateId,
      },
    })] : []),
  ]);

  return NextResponse.json({ ok: true });
}
