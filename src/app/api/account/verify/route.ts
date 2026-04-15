import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createHash } from 'crypto';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { electorateId, addressHash } = await req.json();
  if (!electorateId) return NextResponse.json({ error: 'Missing electorateId' }, { status: 400 });
  const electorate = await prisma.electorate.findUnique({ where: { id: electorateId } });
  if (!electorate) return NextResponse.json({ error: 'Invalid electorate' }, { status: 400 });
  const finalHash = createHash('sha256').update(addressHash + process.env.NEXTAUTH_SECRET).digest('hex');

  // Fetch current termsAcceptedAt so we don't overwrite an existing timestamp
  const userId = (session.user as any).id;
  const existing = await prisma.user.findUnique({ where: { id: userId }, select: { termsAcceptedAt: true } });

  await prisma.user.update({
    where: { id: userId },
    data: {
      electorateId,
      verifiedAt: new Date(),
      addressHash: finalHash,
      termsAcceptedAt: existing?.termsAcceptedAt ?? new Date(),
      verificationStatus: 'ADDRESS',
      electorateVerified: true,
    },
  });
  return NextResponse.json({ ok: true });
}
