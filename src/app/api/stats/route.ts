import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

export const dynamic = 'force-dynamic';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

export async function GET() {
  const bills = await (prisma.bill as any).findMany({
    select: {
      id: true,
      title: true,
      status: true,
      chamber: true,
      introducedAt: true,
      divisionsData: true,
    },
  });

  const passed = bills.filter((b: any) => b.status === 'Passed');
  const notPassed = bills.filter((b: any) => b.status === 'Not Passed');
  const before = bills.filter((b: any) => b.status === 'Before Parliament');

  // Time to passage: intro date → last division date (proxy for passage date)
  const durations: Array<{ days: number; title: string; id: string }> = [];
  for (const b of passed) {
    if (!b.introducedAt) continue;
    let divs: any[] = [];
    try { divs = JSON.parse(b.divisionsData || '[]'); } catch {}
    const divDates = divs.map((d: any) => d.date).filter(Boolean).sort();
    const lastDate = divDates[divDates.length - 1];
    if (!lastDate) continue;
    const d1 = new Date(b.introducedAt);
    const d2 = new Date(lastDate);
    const days = Math.round((d2.getTime() - d1.getTime()) / 86400000);
    if (days >= 0) durations.push({ days, title: b.title, id: b.id });
  }
  durations.sort((a, b) => a.days - b.days);

  const avgDays = durations.length
    ? Math.round(durations.reduce((s, d) => s + d.days, 0) / durations.length)
    : null;
  const medDays = durations.length
    ? durations[Math.floor(durations.length / 2)].days
    : null;

  // Division counts per bill
  const divisionCounts: Array<{ count: number; title: string; id: string }> = bills
    .map((b: any) => {
      let divs: any[] = [];
      try { divs = JSON.parse(b.divisionsData || '[]'); } catch {}
      return { count: divs.length, title: b.title, id: b.id };
    })
    .filter((b: any) => b.count > 0)
    .sort((a: any, b: any) => b.count - a.count);

  // Voice vote vs formal division for passed bills
  const passedWithDivision = passed.filter((b: any) => {
    let divs: any[] = [];
    try { divs = JSON.parse(b.divisionsData || '[]'); } catch {}
    return divs.length > 0;
  }).length;

  // Chamber origin
  const houseOrigin = bills.filter((b: any) =>
    b.chamber && b.chamber.toLowerCase().includes('representatives')
  ).length;
  const senateOrigin = bills.filter((b: any) =>
    b.chamber && b.chamber.toLowerCase().includes('senate')
  ).length;

  return NextResponse.json({
    totals: {
      all: bills.length,
      passed: passed.length,
      notPassed: notPassed.length,
      before: before.length,
    },
    passRate: Math.round((passed.length / bills.length) * 100),
    timing: {
      avg: avgDays,
      median: medDays,
      fastest: durations[0] ?? null,
      slowest: durations[durations.length - 1] ?? null,
      count: durations.length,
    },
    divisions: {
      passedWithFormal: passedWithDivision,
      passedByVoice: passed.length - passedWithDivision,
      mostContested: divisionCounts.slice(0, 3),
    },
    origin: {
      house: houseOrigin,
      senate: senateOrigin,
      unknown: bills.length - houseOrigin - senateOrigin,
    },
  });
}
