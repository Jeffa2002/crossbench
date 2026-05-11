// /src/app/api/alerts/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// DELETE /api/alerts/[id] - Delete an alert
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const { id } = await params;

  // Verify ownership
  const alert = await prisma.billAlert.findUnique({
    where: { id }
  });
  if (!alert || alert.userId !== user.id) {
    return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
  }

  await prisma.billAlert.delete({
    where: { id }
  });

  return NextResponse.json({ success: true });
}

// PATCH /api/alerts/[id] - Toggle alert active status
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const { id } = await params;
  const body = await req.json();

  // Verify ownership
  const alert = await prisma.billAlert.findUnique({
    where: { id }
  });
  if (!alert || alert.userId !== user.id) {
    return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
  }

  const updated = await prisma.billAlert.update({
    where: { id },
    data: { isActive: body.isActive }
  });

  return NextResponse.json(updated);
}
