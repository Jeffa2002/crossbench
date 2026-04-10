#!/usr/bin/env npx tsx
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const HEADERS = {
  'Accept': 'application/json',
  'Origin': 'https://www.aph.gov.au',
  'Referer': 'https://www.aph.gov.au/divisions',
  'User-Agent': 'Crossbench/1.0 civic-tech contact@crossbench.io',
};

interface DivisionSummary {
  divisionId: number;
  title: string;
  question: string;
  ayes: number;
  noes: number;
  date: string;
  result: number; // 1=ayes win, 2=noes win
}

interface MemberVote {
  name: string;
  party: string;
  partyColour: string;
  vote: 'aye' | 'noe';
}

interface StoredDivision {
  divisionId: number;
  question: string;
  ayes: number;
  noes: number;
  date: string;
  passed: boolean;
  byParty: Array<{ party: string; colour: string; ayes: number; noes: number }>;
  memberVotes: MemberVote[];
}

// Extract key words from bill title for matching (strip year, "Bill", common words)
function titleKeyword(title: string): string {
  return title
    .replace(/Bill \d{4}$/, '')
    .replace(/\(No\.\s*\d+\)/, '')
    .trim()
    .split(/\s+/)
    .slice(0, 5)
    .join(' ');
}

async function fetchDivisionsForBill(billTitle: string): Promise<StoredDivision[]> {
  // Search all divisions, paginate through to find matches
  const keyword = titleKeyword(billTitle);
  const results: StoredDivision[] = [];

  // Fetch up to 3 pages of recent divisions
  for (let page = 0; page <= 5; page++) {
    const url = `https://divisions.aph.gov.au/api/division?take=50&skip=${page * 50}`;
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) break;
    const data = await res.json() as { results: DivisionSummary[] };
    if (!data.results?.length) break;

    for (const div of data.results) {
      // Match if division title contains significant words from bill title
      const words = keyword.split(/\s+/).filter(w => w.length > 4);
      const matchCount = words.filter(w => div.title.toLowerCase().includes(w.toLowerCase())).length;
      if (matchCount < 2) continue;

      // Fetch full division with individual votes
      await new Promise(r => setTimeout(r, 200));
      const detailRes = await fetch(`https://divisions.aph.gov.au/api/division/${div.divisionId}`, { headers: HEADERS });
      if (!detailRes.ok) continue;
      const detail = await detailRes.json() as any;

      const memberVotes: MemberVote[] = (detail.votes || []).map((v: any) => ({
        name: v.parliamentarianName,
        party: v.partyName,
        partyColour: v.partyColour,
        vote: v.voteResultId === 1 ? 'aye' : 'noe',
      }));

      // Group by party
      const partyMap: Record<string, { colour: string; ayes: number; noes: number }> = {};
      for (const v of memberVotes) {
        if (!partyMap[v.party]) partyMap[v.party] = { colour: v.partyColour, ayes: 0, noes: 0 };
        partyMap[v.party][v.vote === 'aye' ? 'ayes' : 'noes']++;
      }
      const byParty = Object.entries(partyMap)
        .map(([party, d]) => ({ party, colour: d.colour, ayes: d.ayes, noes: d.noes }))
        .sort((a, b) => (b.ayes + b.noes) - (a.ayes + a.noes));

      results.push({
        divisionId: div.divisionId,
        question: div.question,
        ayes: div.ayes,
        noes: div.noes,
        date: div.date,
        passed: div.result === 1,
        byParty,
        memberVotes,
      });
    }

    // If we found matches, no need to keep paginating far back
    if (results.length > 0 && page > 1) break;
  }

  return results;
}

async function main() {
  const bills = await (prisma.bill as any).findMany({
    where: { divisionsData: null },
    select: { id: true, title: true, status: true },
    orderBy: { status: 'asc' }, // Passed first
    take: 200,
  });

  console.log(`Fetching divisions for ${bills.length} bills...`);
  let done = 0;
  let withDivisions = 0;

  for (const bill of bills) {
    try {
      const divisions = await fetchDivisionsForBill(bill.title);
      await (prisma.bill as any).update({
        where: { id: bill.id },
        data: { divisionsData: JSON.stringify(divisions) },
      });
      done++;
      if (divisions.length > 0) {
        withDivisions++;
        console.log(`  ✓ ${bill.title.slice(0, 55)} — ${divisions.length} division(s)`);
      }
      if (done % 20 === 0) console.log(`  ${done}/${bills.length} processed`);
      await new Promise(r => setTimeout(r, 400));
    } catch (e) {
      console.error(`  Error: ${bill.title.slice(0, 40)}:`, (e as Error).message);
    }
  }

  console.log(`\nDone: ${done} bills, ${withDivisions} had division data`);
  await prisma.$disconnect();
}

main().catch(console.error);
