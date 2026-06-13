import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAccess } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

function parseDateInput(value: string | null, endOfDay = false) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  if (endOfDay) date.setUTCDate(date.getUTCDate() + 1);
  return date;
}

function resolveRange(req: NextRequest) {
  const now = new Date();
  const range = req.nextUrl.searchParams.get('range') || '7d';
  if (range === 'custom') {
    const start = parseDateInput(req.nextUrl.searchParams.get('from'));
    const end = parseDateInput(req.nextUrl.searchParams.get('to'), true);
    if (start && end && start < end) return { start, end };
  }
  const days = range === '90d' ? 90 : range === '30d' ? 30 : 7;
  return { start: new Date(now.getTime() - days * 24 * 60 * 60 * 1000), end: now };
}

function csvCell(value: unknown) {
  const text = value == null ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(req: NextRequest) {
  const admin = await requireAdminAccess();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { start, end } = resolveRange(req);
  const sessions = await prisma.webVisitSession.findMany({
    where: { startedAt: { gte: start, lt: end } },
    orderBy: { startedAt: 'desc' },
    take: 5000,
    include: { pageViews: { orderBy: { startedAt: 'asc' }, take: 100 } },
  });

  const rows: unknown[][] = [
    ['session_id', 'visitor_type', 'country', 'region', 'city', 'device', 'browser', 'started_at', 'last_seen_at', 'first_path', 'last_path', 'referrer', 'page_path', 'page_title', 'page_started_at', 'duration_seconds'],
  ];
  for (const session of sessions) {
    for (const view of session.pageViews) {
      rows.push([
        session.id,
        session.visitorType,
        session.countryCode,
        session.region,
        session.city,
        session.deviceType,
        session.browser,
        session.startedAt.toISOString(),
        session.lastSeenAt.toISOString(),
        session.firstPath,
        session.lastPath,
        session.referrer,
        view.path,
        view.title,
        view.startedAt.toISOString(),
        view.durationSeconds,
      ]);
    }
  }

  return new NextResponse(rows.map(row => row.map(csvCell).join(',')).join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="crossbench-web-analytics-${start.toISOString().slice(0, 10)}-${end.toISOString().slice(0, 10)}.csv"`,
    },
  });
}
