// /src/app/api/alerts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/alerts - List user's alerts
export async function GET(req: NextRequest) {
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

  const alerts = await prisma.billAlert.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: { notifications: true }
      }
    }
  });

  return NextResponse.json(alerts);
}

// POST /api/alerts - Create new alert
export async function POST(req: NextRequest) {
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

  const body = await req.json();
  const { keyword } = body;

  if (!keyword || typeof keyword !== 'string' || keyword.trim().length < 2) {
    return NextResponse.json({ error: 'Keyword must be at least 2 characters' }, { status: 400 });
  }

  const normalizedKeyword = keyword.trim().toLowerCase();

  // Check limit (max 10 alerts per user)
  const existingCount = await prisma.billAlert.count({
    where: { userId: user.id }
  });
  if (existingCount >= 10) {
    return NextResponse.json({ error: 'Maximum 10 alerts allowed' }, { status: 400 });
  }

  // Check if already exists
  const existing = await prisma.billAlert.findUnique({
    where: {
      userId_keyword: {
        userId: user.id,
        keyword: normalizedKeyword
      }
    }
  });
  if (existing) {
    return NextResponse.json({ error: 'Alert for this keyword already exists' }, { status: 400 });
  }

  const alert = await prisma.billAlert.create({
    data: {
      userId: user.id,
      keyword: normalizedKeyword,
    }
  });

  return NextResponse.json(alert, { status: 201 });
}
