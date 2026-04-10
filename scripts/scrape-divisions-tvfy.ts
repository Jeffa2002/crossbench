#!/usr/bin/env npx tsx
/**
 * Scrape division data from They Vote For You for all bills.
 * Monthly date windows from Oct 2024 to present (covers both 47th and 48th parliaments).
 * Strict title matching: division name must contain the bill's short title substring.
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const API_KEY = encodeURIComponent(process.env.TVFY_API_KEY!);
const BASE = 'https://theyvoteforyou.org.au/api/v1';

interface TvfyDivision {
  id: number;
  house: string;
  name: string;
  date: string;
  aye_votes: number;
  no_votes: number;
}

interface StoredDivision {
  id: number;
  house: string;
  name: string;
  date: string;
  ayes: number;
  noes: number;
  passed: boolean;
  byParty: Array<{ party: string; ayes: number; noes: number }>;
  memberVotes: Array<{ name: string; electorate: string; party: string; vote: string }>;
}

/** Strip "Bill YYYY" suffix and return the short title */
function shortTitle(fullTitle: string): string {
  return fullTitle
    .replace(/\s+(Bill|Act)\s+\d{4}(-\d{4})?(\s+\(No\.\s*\d+\))?$/i, '')
    .trim();
}

/**
 * Strict matching: division name must contain the bill's short title (or a 
 * long enough prefix of it), case-insensitive.
 * Also handles HTML entities in bill titles (e.g. &rsquo; → ').
 */
function titleMatches(divName: string, billTitle: string): boolean {
  const decodeEntities = (s: string) =>
    s.replace(/&rsquo;/g, "'").replace(/&amp;/g, '&').replace(/&quot;/g, '"');

  const short = decodeEntities(shortTitle(billTitle)).toLowerCase();
  const div = divName.toLowerCase();

  if (div.includes(short)) return true;

  // Try progressively shorter prefix (must be at least 60% and min 15 chars)
  const words = short.split(/\s+/);
  const minLen = Math.max(3, Math.ceil(words.length * 0.6));
  for (let len = words.length - 1; len >= minLen; len--) {
    const attempt = words.slice(0, len).join(' ');
    if (attempt.length >= 15 && div.includes(attempt)) return true;
  }

  return false;
}

async function fetchRange(start: string, end: string): Promise<TvfyDivision[]> {
  const url = `${BASE}/divisions.json?key=${API_KEY}&per_page=100&start_date=${start}&end_date=${end}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Crossbench/1.0' } });
  if (!res.ok) return [];
  return res.json();
}

async function fetchDetail(id: number): Promise<StoredDivision | null> {
  const res = await fetch(`${BASE}/divisions/${id}.json?key=${API_KEY}`, {
    headers: { 'User-Agent': 'Crossbench/1.0' },
  });
  if (!res.ok) return null;
  const data = await res.json() as any;

  const memberVotes = (data.votes || []).map((v: any) => ({
    name: `${v.member.first_name} ${v.member.last_name}`,
    electorate: v.member.electorate,
    party: v.member.party,
    vote: v.vote,
  }));

  const partyMap: Record<string, { ayes: number; noes: number }> = {};
  for (const v of memberVotes) {
    if (!partyMap[v.party]) partyMap[v.party] = { ayes: 0, noes: 0 };
    partyMap[v.party][v.vote === 'aye' ? 'ayes' : 'noes']++;
  }

  return {
    id: data.id,
    house: data.house,
    name: data.name,
    date: data.date,
    ayes: data.aye_votes,
    noes: data.no_votes,
    passed: data.aye_votes > data.no_votes,
    byParty: Object.entries(partyMap)
      .map(([party, d]) => ({ party, ayes: d.ayes, noes: d.noes }))
      .sort((a, b) => (b.ayes + b.noes) - (a.ayes + a.noes)),
    memberVotes,
  };
}

/** Monthly ranges from Oct 2024 to today */
function dateRanges(): Array<[string, string]> {
  const ranges: Array<[string, string]> = [];
  const now = new Date();
  let y = 2024, m = 10; // Start Oct 2024 (47th parliament resumed)
  while (y < now.getFullYear() || (y === now.getFullYear() && m <= now.getMonth() + 1)) {
    const start = `${y}-${String(m).padStart(2, '0')}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const end = `${y}-${String(m).padStart(2, '0')}-${lastDay}`;
    ranges.push([start, end]);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return ranges;
}

async function main() {
  const bills = await (prisma.bill as any).findMany({
    select: { id: true, title: true, status: true },
  });

  // Fetch all divisions in monthly windows
  const allDivisions: TvfyDivision[] = [];
  for (const [start, end] of dateRanges()) {
    const divs = await fetchRange(start, end);
    if (divs.length > 0) {
      allDivisions.push(...divs);
      process.stdout.write(`  ${start}: ${divs.length} divs\n`);
    }
    await new Promise(r => setTimeout(r, 200));
  }
  console.log(`\nTotal divisions: ${allDivisions.length}\n`);

  let matched = 0;

  for (const bill of bills) {
    const matchingDivs = allDivisions.filter(d => titleMatches(d.name, bill.title));

    if (matchingDivs.length === 0) {
      await (prisma.bill as any).update({
        where: { id: bill.id },
        data: { divisionsData: JSON.stringify([]) },
      });
      continue;
    }

    console.log(`${bill.title.slice(0, 70)} [${matchingDivs.length}]`);
    const stored: StoredDivision[] = [];

    for (const div of matchingDivs) {
      await new Promise(r => setTimeout(r, 200));
      const detail = await fetchDetail(div.id);
      if (!detail) continue;
      stored.push(detail);
      console.log(`  ${detail.passed ? '✓' : '✗'} [${detail.house}] ${detail.name.slice(0, 55)} ${detail.ayes}/${detail.noes}`);
    }

    await (prisma.bill as any).update({
      where: { id: bill.id },
      data: { divisionsData: JSON.stringify(stored) },
    });
    if (stored.length > 0) matched++;
  }

  console.log(`\n✓ Done: ${matched}/${bills.length} bills matched`);
  await prisma.$disconnect();
}

main().catch(console.error);
