import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createHmac, timingSafeEqual } from 'crypto';

type VerificationPayload = {
  electorateId: string;
  addressHash: string;
};

function readVerificationToken(token: unknown): VerificationPayload | null {
  if (typeof token !== 'string') return null;
  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) return null;

  const expected = createHmac('sha256', process.env.NEXTAUTH_SECRET ?? '').update(encodedPayload).digest('hex');
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as VerificationPayload;
    if (!payload.electorateId || !payload.addressHash) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { electorateId, verificationToken } = await req.json();
  const verification = readVerificationToken(verificationToken);
  if (!electorateId || !verification || verification.electorateId !== electorateId) {
    return NextResponse.json({ error: 'Invalid verification token' }, { status: 400 });
  }
  const electorate = await prisma.electorate.findUnique({ where: { id: electorateId } });
  if (!electorate) return NextResponse.json({ error: 'Invalid electorate' }, { status: 400 });

  // Fetch current user state
  const userId = (session.user as any).id;
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { termsAcceptedAt: true, electorateId: true, verifiedAt: true },
  });

  const isChange = !!existing?.verifiedAt; // already verified = this is a change

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
