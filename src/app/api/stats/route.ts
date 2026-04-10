import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

export const dynamic = 'force-dynamic';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// Known parliament seat compositions (from APH + election results)
const PARLIAMENT_COMPOSITION: Record<number, {
  label: string;
  dates: string;
  hor: Record<string, number>;
  senate: Record<string, number>;
}> = {
  48: {
    label: '48th Parliament',
    dates: 'July 2025 – present',
    hor: {
      'Australian Labor Party': 94,
      'Liberal Party': 28,
      'Liberal National Party': 9,
      'National Party': 15,
      'Australian Greens': 1,
      'Independent': 4,
      "Katter's Australian Party": 1,
    },
    senate: {
      'Australian Labor Party': 28,
      'Liberal Party': 19,
      'National Party': 6,
      'Australian Greens': 11,
      "Pauline Hanson's One Nation Party": 2,
      'Independent': 3,
      'Jacqui Lambie Network': 1,
      'Liberal National Party': 4,
      'Country Liberal Party': 2,
    },
  },
  47: {
    label: '47th Parliament',
    dates: 'July 2022 – May 2025',
    hor: {
      'Australian Labor Party': 77,
      'Liberal Party': 24,
      'National Party': 16,
      'Liberal National Party': 23,
      'Australian Greens': 4,
      'Independent': 10,
      "Katter's Australian Party": 1,
      'Centre Alliance': 1,
    },
    senate: {
      'Australian Labor Party': 26,
      'Liberal Party': 18,
      'National Party': 6,
      'Australian Greens': 12,
      "Pauline Hanson's One Nation Party": 2,
      'Independent': 4,
      'Jacqui Lambie Network': 1,
      'United Australia Party': 1,
      'Liberal National Party': 5,
      'Country Liberal Party': 1,
    },
  },
  46: {
    label: '46th Parliament',
    dates: 'July 2019 – May 2022',
    hor: {
      'Australian Labor Party': 69,
      'Liberal Party': 58,
      'National Party': 10,
      'Liberal National Party': 23,
      'Country Liberal Party': 1,
      'Australian Greens': 1,
      'Centre Alliance': 1,
      "Katter's Australian Party": 1,
      'Independent': 6,
    },
    senate: {
      'Australian Labor Party': 26,
      'Liberal Party': 17,
      'National Party': 7,
      'Liberal National Party': 5,
      'Country Liberal Party': 1,
      'Australian Greens': 9,
      "Pauline Hanson's One Nation Party": 2,
      'Centre Alliance': 2,
      'Jacqui Lambie Network': 1,
    },
  },
};

function computeStats(bills: any[]) {
  const passed = bills.filter((b: any) => b.status === 'Passed');
  const notPassed = bills.filter((b: any) => b.status === 'Not Passed');
  const before = bills.filter((b: any) => b.status === 'Before Parliament');

  // Timing: intro date → last division date
  const durations: Array<{ days: number; title: string; id: string }> = [];
  for (const b of passed) {
    if (!b.introducedAt) continue;
    let divs: any[] = [];
    try { divs = JSON.parse(b.divisionsData || '[]'); } catch {}
    const divDates = divs.map((d: any) => d.date).filter(Boolean).sort();
    const lastDate = divDates[divDates.length - 1];
    if (!lastDate) continue;
    const days = Math.round((new Date(lastDate).getTime() - new Date(b.introducedAt).getTime()) / 86400000);
    if (days >= 0) durations.push({ days, title: b.title, id: b.id });
  }
  durations.sort((a, b) => a.days - b.days);

  // Division counts per bill
  const divisionCounts = bills
    .map((b: any) => {
      let divs: any[] = [];
      try { divs = JSON.parse(b.divisionsData || '[]'); } catch {}
      return { count: divs.length, title: b.title, id: b.id };
    })
    .filter((b: any) => b.count > 0)
    .sort((a: any, b: any) => b.count - a.count);

  const passedWithDivision = passed.filter((b: any) => {
    let divs: any[] = [];
    try { divs = JSON.parse(b.divisionsData || '[]'); } catch {}
    return divs.length > 0;
  }).length;

  const houseOrigin = bills.filter((b: any) => b.chamber?.toLowerCase().includes('representatives')).length;
  const senateOrigin = bills.filter((b: any) => b.chamber?.toLowerCase().includes('senate')).length;

  return {
    totals: { all: bills.length, passed: passed.length, notPassed: notPassed.length, before: before.length },
    passRate: bills.length ? Math.round((passed.length / bills.length) * 100) : 0,
    timing: {
      avg: durations.length ? Math.round(durations.reduce((s, d) => s + d.days, 0) / durations.length) : null,
      median: durations.length ? durations[Math.floor(durations.length / 2)].days : null,
      fastest: durations[0] ?? null,
      slowest: durations[durations.length - 1] ?? null,
      count: durations.length,
    },
    divisions: {
      passedWithFormal: passedWithDivision,
      passedByVoice: passed.length - passedWithDivision,
      mostContested: divisionCounts.slice(0, 3),
    },
    origin: { house: houseOrigin, senate: senateOrigin },
  };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const parlParam = searchParams.get('parliament');
  const parlNum = parlParam ? parseInt(parlParam) : null;

  const bills = await (prisma.bill as any).findMany({
    where: parlNum ? { parliamentNumber: parlNum } : undefined,
    select: { id: true, title: true, status: true, chamber: true, introducedAt: true, divisionsData: true, parliamentNumber: true },
  });

  // Available parliaments
  const allBills = await (prisma.bill as any).findMany({
    select: { parliamentNumber: true },
  });
  const parliamentNumbers = [...new Set(
    allBills.map((b: any) => b.parliamentNumber).filter(Boolean)
  )].sort((a: any, b: any) => b - a);

  const stats = computeStats(bills);
  const composition = parlNum ? (PARLIAMENT_COMPOSITION[parlNum] ?? null) : null;

  return NextResponse.json({
    ...stats,
    parliament: parlNum,
    parliaments: parliamentNumbers,
    composition,
  });
}
