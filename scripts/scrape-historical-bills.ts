#!/usr/bin/env npx tsx
/**
 * Scrape all bills from APH for specified parliaments using Playwright.
 * Targets: 47th (2022-2025), 46th (2019-2022) parliaments.
 */
import { chromium } from 'playwright';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const BASE = 'https://www.aph.gov.au';

const STATUSES = [
  { status: 'Passed', aphStatus: 'Assented', billStatus: 'Assented' },
  { status: 'Not Passed', aphStatus: 'Defeated', billStatus: 'Defeated' },
  { status: 'Not Passed', aphStatus: 'Lapsed', billStatus: 'Lapsed' },
  { status: 'Not Passed', aphStatus: 'Withdrawn', billStatus: 'Withdrawn' },
];

const PARLIAMENTS = [47, 46];
const PARL_DATES: Record<number, { start: string; end: string; number: number }> = {
  47: { start: '2022-05-21', end: '2025-05-03', number: 47 },
  46: { start: '2019-05-18', end: '2022-05-21', number: 46 },
};

interface ScrapedBill {
  bid: string;
  title: string;
  chamber: string;
  aphUrl: string;
  status: string;
  introducedDate?: string;
  parliamentNumber: number;
  sponsorName?: string;
}

async function scrapePage(page: any, url: string): Promise<ScrapedBill[]> {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

  // Wait for bills to load - they're rendered by React
  try {
    await page.waitForSelector('.bills-search-result', { timeout: 15000 });
  } catch {
    // Try alternative selectors
    try { await page.waitForSelector('table.bills', { timeout: 10000 }); } catch {}
  }

  // Extract the bill data from the page
  const bills = await page.evaluate(() => {
    const results: any[] = [];

    // Try multiple selectors the APH page might use
    const rows = document.querySelectorAll(
      '.bill-result, .bills-search-result, tr[data-bid], .result-row, ' +
      '.bills-listing .item, [class*="bill-row"], .bill-list-item'
    );

    if (rows.length === 0) {
      // Fallback: look for any links that match the bId pattern
      const links = document.querySelectorAll('a[href*="bId="]');
      links.forEach(link => {
        const href = (link as HTMLAnchorElement).href;
        const bidMatch = href.match(/bId=([a-zA-Z0-9]+)/);
        if (!bidMatch) return;
        const bid = bidMatch[1];
        const title = link.textContent?.trim() || '';
        if (title && bid) {
          results.push({ bid, title, href });
        }
      });
    } else {
      rows.forEach(row => {
        const link = row.querySelector('a[href*="bId="]') as HTMLAnchorElement;
        if (!link) return;
        const bidMatch = link.href.match(/bId=([a-zA-Z0-9]+)/);
        if (!bidMatch) return;
        results.push({
          bid: bidMatch[1],
          title: link.textContent?.trim() || '',
          href: link.href,
        });
      });
    }

    return results;
  });

  return bills.map((b: any) => ({
    bid: b.bid,
    title: b.title,
    chamber: b.bid.startsWith('s') ? 'Senate' : 'House of Representatives',
    aphUrl: `${BASE}/Parliamentary_Business/Bills_Legislation/Bills_Search_Results/Result?bId=${b.bid}`,
    status: '', // filled by caller
    parliamentNumber: 0, // filled by caller
  })).filter(b => b.title && b.bid);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();

  let totalFound = 0;
  let totalCreated = 0;
  let totalUpdated = 0;

  for (const parlNum of PARLIAMENTS) {
    const parlDates = PARL_DATES[parlNum];
    console.log(`\n=== Scraping Parliament ${parlNum} (${parlDates.start} to ${parlDates.end}) ===`);

    for (const { status, billStatus } of STATUSES) {
      console.log(`\n  Status: ${status} (${billStatus})`);

      let pageNum = 1;
      let hasMore = true;
      const seenBids = new Set<string>();

      while (hasMore) {
        const url = `${BASE}/Parliamentary_Business/Bills_Legislation/Bills_Search_Results?ParliamentNumber=${parlNum}&BillStatus=${billStatus}&page=${pageNum}&perPage=50`;
        console.log(`    Page ${pageNum}: ${url}`);

        try {
          const bills = await scrapePage(page, url);
          const newBids = bills.filter(b => !seenBids.has(b.bid));

          if (newBids.length === 0 && pageNum > 1) {
            hasMore = false;
            break;
          }

          for (const bill of newBids) {
            seenBids.add(bill.bid);
            bill.status = status;
            bill.parliamentNumber = parlNum;

            totalFound++;

            // Determine introducedAt from parliament start date as fallback
            const introDate = bill.introducedDate
              ? new Date(bill.introducedDate)
              : new Date(parlDates.start);

            try {
              const existing = await (prisma.bill as any).findFirst({
                where: {
                  OR: [
                    { id: bill.bid },
                    { aphUrl: { contains: `bId=${bill.bid}` } },
                    { title: bill.title },
                  ],
                },
              });

              if (existing) {
                await (prisma.bill as any).update({
                  where: { id: existing.id },
                  data: {
                    parliamentNumber: parlNum,
                    status: bill.status,
                    ...(existing.introducedAt ? {} : { introducedAt: introDate }),
                  },
                });
                totalUpdated++;
                process.stdout.write('u');
              } else {
                // Generate a cuid-style id from bid
                await (prisma.bill as any).create({
                  data: {
                    id: `hist_${bill.bid}_${Date.now()}`,
                    title: bill.title,
                    chamber: bill.chamber,
                    status: bill.status,
                    aphUrl: bill.aphUrl,
                    introducedAt: introDate,
                    parliamentNumber: parlNum,
                    lastUpdatedAt: new Date(),
                  },
                });
                totalCreated++;
                process.stdout.write('.');
              }
            } catch (err: any) {
              process.stdout.write('E');
              if (process.env.VERBOSE) console.error('\nError:', err.message);
            }
          }

          // Check if there are more pages
          const hasNextPage = await page.evaluate(() => {
            const nextBtn = document.querySelector('.pagination .next:not(.disabled), a[aria-label="Next"]');
            return !!nextBtn && !nextBtn.classList.contains('disabled');
          });

          if (!hasNextPage || newBids.length < 10) {
            hasMore = false;
          } else {
            pageNum++;
          }

          // Respectful rate limiting
          await new Promise(r => setTimeout(r, 1500));

        } catch (err: any) {
          console.error(`\n    Error on page ${pageNum}:`, err.message);
          hasMore = false;
        }
      }

      console.log(`\n    Found ${seenBids.size} bills for ${status}`);
    }
  }

  await browser.close();
  await prisma.$disconnect();

  console.log(`\n=== Complete ===`);
  console.log(`Total found: ${totalFound}`);
  console.log(`Created: ${totalCreated} | Updated: ${totalUpdated}`);
}

main().catch(console.error);
