#!/usr/bin/env npx tsx
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const BASE = 'https://www.aph.gov.au';
const BILLS_URL = `${BASE}/Parliamentary_Business/Bills_Legislation/Bills_before_Parliament`;

async function fetchPage(page: number): Promise<string> {
  const url = page > 1 ? `${BILLS_URL}?page=${page}` : BILLS_URL;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Crossbench/1.0 civic-tech contact@crossbench.io' }
  });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${url}`);
  return res.text();
}

function parseBills(html: string) {
  const bills: { bid: string; title: string; chamber: string; aphUrl: string }[] = [];
  const rowRegex = /class="row">([\s\S]*?)(?=class="row"|<div class="pagination)/g;
  let match;
  while ((match = rowRegex.exec(html)) !== null) {
    const row = match[1];
    const m = row.match(/Bills_Search_Results\/Result\?bId=([^"]+)"[^>]*>([^<]+)<\/a>/);
    if (!m) continue;
    const [, bid, title] = m;
    bills.push({
      bid,
      title: title.trim(),
      chamber: bid.startsWith('s') ? 'SENATE' : 'HOUSE',
      aphUrl: `${BASE}/Parliamentary_Business/Bills_Legislation/Bills_Search_Results/Result?bId=${bid}`
    });
  }
  return bills;
}

async function main() {
  console.log('Starting Crossbench bill ingestion...');
  let total = 0;

  for (let page = 1; page <= 10; page++) {
    try {
      const html = await fetchPage(page);
      const bills = parseBills(html);
      if (bills.length === 0) break;

      for (const bill of bills) {
        await (prisma.bill as any).upsert({
          where: { aphUrl: bill.aphUrl },
          create: {
            title: bill.title,
            aphUrl: bill.aphUrl,
            chamber: bill.chamber as any,
            status: 'Before Parliament',
            lastUpdatedAt: new Date(),
          },
          update: {
            title: bill.title,
            status: 'Before Parliament',
            lastUpdatedAt: new Date(),
          },
        });
        total++;
      }
      console.log(`Page ${page}: ${bills.length} bills processed`);
    } catch (e) {
      console.error(`Page ${page} failed:`, e);
      break;
    }
  }

  console.log(`Ingestion complete: ${total} bills upserted`);
  await prisma.$disconnect();
}

main().catch(console.error);
