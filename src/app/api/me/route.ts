import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: (session.user as any).id },
    select: {
      id: true,
      email: true,
      role: true,
      name: true,
      electorateId: true,
      verificationStatus: true,
      electorateVerified: true,
    },
  });

  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(user);
}
