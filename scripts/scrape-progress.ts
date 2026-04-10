#!/usr/bin/env npx tsx
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

interface Stage {
  chamber: string;
  event: string;
  date: string | null;
}

// Only keep meaningful progress stages
const MEANINGFUL = [
  /^Second reading moved/i,
  /^Second reading debate/i,
  /^Second reading agreed to/i,
  /^Second reading negatived/i,
  /^Committee of the Whole/i,
  /^Third reading agreed to/i,
  /^Third reading negatived/i,
  /^Consideration of Senate message/i,
  /^House agreed to Senate amendments/i,
  /^Senate agreed to House amendments/i,
  /^Finally passed both Houses/i,
  /^Referred to Committee/i,
  /^Committee report/i,
  /^\d+\s+\w+\s+agreed to/i,  // e.g. "3 Government agreed to"
  /^Royal Assent/i,
  /^Withdrawn/i,
  /^Lapsed/i,
  /^Negatived/i,
];

function isMeaningful(event: string): boolean {
  return MEANINGFUL.some(re => re.test(event));
}

async function scrapeProgress(aphUrl: string): Promise<Stage[]> {
  const res = await fetch(aphUrl, {
    headers: { 'User-Agent': 'Crossbench/1.0 civic-tech contact@crossbench.io' },
  });
  if (!res.ok) return [];
  const html = await res.text();

  // The progress table is inside a specific section - find it
  // The table rows with stage info appear before the "Text of Bill" section
  const progressSection = html.indexOf('progressRepeater');
  const textSection = html.indexOf('textOfBillReadingControl');
  const relevantHtml = progressSection > -1 && textSection > -1
    ? html.slice(progressSection, textSection)
    : html;

  const stripped = relevantHtml.replace(/<[^>]+>/g, '\n').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&#39;/g, "'");
  const lines = stripped.split('\n').map(l => l.trim()).filter(Boolean);

  const stages: Stage[] = [];
  let currentChamber = '';

  for (const line of lines) {
    if (line === 'House of Representatives') { currentChamber = 'House of Representatives'; continue; }
    if (line === 'Senate') { currentChamber = 'Senate'; continue; }

    // Date pattern: "Event text DD Mon YYYY" or just "Event text"
    const dateMatch = line.match(/\b(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4})\s*$/);
    const date = dateMatch ? dateMatch[1] : null;
    const event = date ? line.slice(0, line.lastIndexOf(dateMatch![0])).trim() : line;

    const isFinal = /Finally passed both Houses/i.test(event);

    if (isFinal) {
      stages.push({ chamber: 'Both Houses', event: 'Finally passed both Houses', date });
    } else if (currentChamber && isMeaningful(event)) {
      stages.push({ chamber: currentChamber, event, date });
    }
  }

  // Deduplicate
  const seen = new Set<string>();
  return stages.filter(s => {
    const key = `${s.chamber}|${s.event}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function main() {
  const bills = await (prisma.bill as any).findMany({
    select: { id: true, aphUrl: true, title: true, status: true },
    take: 200,
  });

  console.log(`Scraping progress for ${bills.length} bills...`);
  let done = 0;
  let withStages = 0;

  for (const bill of bills) {
    try {
      const stages = await scrapeProgress(bill.aphUrl);
      await (prisma.bill as any).update({
        where: { id: bill.id },
        data: { parliamentaryProgress: JSON.stringify(stages) },
      });
      done++;
      if (stages.length > 0) withStages++;
      if (done % 10 === 0) console.log(`  ${done}/${bills.length} done (${withStages} with stages)`);
      await new Promise(r => setTimeout(r, 300));
    } catch (e) {
      console.error(`  Error on ${bill.title.slice(0, 40)}:`, (e as Error).message);
    }
  }

  console.log(`\nDone: ${done} bills scraped, ${withStages} had meaningful stages`);
  await prisma.$disconnect();
}

main().catch(console.error);
