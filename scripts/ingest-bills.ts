#!/usr/bin/env npx tsx
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });
const BASE = 'https://www.aph.gov.au';

const SOURCES = [
  {
    url: `${BASE}/Parliamentary_Business/Bills_Legislation/Bills_before_Parliament`,
    status: 'Before Parliament',
    pages: 10,
  },
  {
    url: `${BASE}/Parliamentary_Business/Bills_Legislation/Assented_Bills_of_the_current_Parliament`,
    status: 'Passed',
    outcome: 'Assented',
    pages: 5,
  },
  {
    url: `${BASE}/Parliamentary_Business/Bills_Legislation/Bills_not_passed_current_Parliament`,
    status: 'Not Passed',
    outcome: 'Not Passed',
    pages: 5,
  },
];

async function fetchPage(url: string, page: number): Promise<string> {
  const pageUrl = page > 1 ? `${url}?page=${page}` : url;
  const res = await fetch(pageUrl, {
    headers: { 'User-Agent': 'Crossbench/1.0 civic-tech contact@crossbench.io' },
  });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${pageUrl}`);
  return res.text();
}

interface ParsedBill {
  bid: string;
  title: string;
  chamber: string;
  aphUrl: string;
  introducedDate?: string;
}

function parseBills(html: string): ParsedBill[] {
  const bills: ParsedBill[] = [];
  const rowRegex = /class="row">([\s\S]*?)(?=class="row"|<div class="pagination)/g;
  let match;
  while ((match = rowRegex.exec(html)) !== null) {
    const row = match[1];
    // Match bill link
    const m = row.match(/Bills_Search_Results\/Result\?bId=([^"]+)"[^>]*>([^<]+)<\/a>/);
    if (!m) continue;
    const [, bid, title] = m;
    // Try parse introduced date
    const dateMatch = row.match(/(\d{1,2}\s+\w+\s+\d{4})/);
    bills.push({
      bid,
      title: title.trim(),
      chamber: bid.startsWith('s') ? 'SENATE' : 'HOUSE',
      aphUrl: `${BASE}/Parliamentary_Business/Bills_Legislation/Bills_Search_Results/Result?bId=${bid}`,
      introducedDate: dateMatch?.[1],
    });
  }
  return bills;
}

async function main() {
  console.log('Starting Crossbench bill ingestion...');
  let total = 0;
  let updated = 0;
  let created = 0;

  for (const source of SOURCES) {
    console.log(`\nScraping: ${source.status}`);

    for (let page = 1; page <= source.pages; page++) {
      try {
        const html = await fetchPage(source.url, page);
        const bills = parseBills(html);
        if (bills.length === 0) {
          console.log(`  Page ${page}: no bills found, stopping`);
          break;
        }

        for (const bill of bills) {
          let introducedAt: Date | undefined;
          if (bill.introducedDate) {
            const d = new Date(bill.introducedDate);
            if (!isNaN(d.getTime())) introducedAt = d;
          }

          const existing = await (prisma.bill as any).findUnique({ where: { aphUrl: bill.aphUrl } });

          if (existing) {
            // Only update status/outcome if it changed
            const needsUpdate =
              existing.status !== source.status ||
              existing.outcome !== (source.outcome ?? null);

            if (needsUpdate) {
              await (prisma.bill as any).update({
                where: { aphUrl: bill.aphUrl },
                data: {
                  title: bill.title,
                  status: source.status,
                  outcome: source.outcome ?? null,
                  outcomeDate: source.outcome ? new Date() : null,
                  lastUpdatedAt: new Date(),
                  ...(introducedAt ? { introducedAt } : {}),
                },
              });
              console.log(`  Updated: ${bill.title.substring(0, 60)} → ${source.status}`);
              updated++;
            }
          } else {
            await (prisma.bill as any).create({
              data: {
                title: bill.title,
                aphUrl: bill.aphUrl,
                chamber: bill.chamber as any,
                status: source.status,
                outcome: source.outcome ?? null,
                outcomeDate: source.outcome ? new Date() : null,
                lastUpdatedAt: new Date(),
                ...(introducedAt ? { introducedAt } : {}),
              },
            });
            created++;
          }
          total++;
        }

        console.log(`  Page ${page}: ${bills.length} bills processed`);
        // Small delay to be polite to APH servers
        await new Promise(r => setTimeout(r, 500));
      } catch (e) {
        console.error(`  Page ${page} error:`, e);
        break;
      }
    }
  }

  const counts = await (prisma.bill as any).groupBy({
    by: ['status'],
    _count: true,
  });

  console.log('\nIngestion complete:');
  console.log(`  Total processed: ${total}`);
  console.log(`  New: ${created}, Updated: ${updated}`);
  console.log('\nCurrent DB breakdown:');
  counts.forEach((c: any) => console.log(`  ${c.status}: ${c._count}`));

  await prisma.$disconnect();
}

main().catch(console.error);
