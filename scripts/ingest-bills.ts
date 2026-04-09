#!/usr/bin/env npx ts-node
/**
 * Crossbench Bill Ingestion Script
 * Scrapes APH bills page and upserts into database
 * Run: npx ts-node scripts/ingest-bills.ts
 * Schedule: cron daily at 6am and 6pm
 */

import { PrismaClient, BillChamber } from "@prisma/client";

const prisma = new PrismaClient();
const APH_BILLS_URL = "https://www.aph.gov.au/Parliamentary_Business/Bills_Legislation/Bills_before_Parliament";
const OA_API_BASE = "https://www.openaustralia.org.au/api";
const OA_API_KEY = process.env.OPENAUSTRALIA_API_KEY || "demo";

interface ScrapedBill {
  title: string;
  aphUrl: string;
  chamber: BillChamber;
  status: string;
  sponsorName?: string;
  portfolio?: string;
  introducedAt?: Date;
}

async function scrapeAphBills(): Promise<ScrapedBill[]> {
  console.log("Fetching APH bills page...");
  const res = await fetch(APH_BILLS_URL, {
    headers: { "User-Agent": "Crossbench/1.0 civic-tech contact@crossbench.io" }
  });
  if (!res.ok) throw new Error(`APH fetch failed: ${res.status}`);
  const html = await res.text();
  
  const bills: ScrapedBill[] = [];
  const rowRegex = /<tr[^>]*>[\s\S]*?<\/tr>/gi;
  const rows = html.match(rowRegex) || [];
  
  for (const row of rows) {
    const linkMatch = row.match(/href="(\/Parliamentary_Business\/Bills_Legislation\/Bills_Search_Results\/Result[^"]+)"/i);
    const titleMatch = row.match(/<a[^>]*>([^<]+Bill[^<]*)<\/a>/i);
    if (!linkMatch || !titleMatch) continue;
    const aphUrl = `https://www.aph.gov.au${linkMatch[1]}`;
    const title = titleMatch[1].trim();
    const chamberText = row.toLowerCase();
    let chamber: BillChamber = BillChamber.HOUSE;
    if (chamberText.includes("senate")) chamber = BillChamber.SENATE;
    else if (chamberText.includes("joint")) chamber = BillChamber.JOINT;
    const statusMatch = row.match(/class="bill-status[^"]*"[^>]*>([^<]+)</i);
    const status = statusMatch ? statusMatch[1].trim() : "Before Parliament";
    bills.push({ title, aphUrl, chamber, status });
  }
  
  console.log(`Found ${bills.length} bills`);
  return bills;
}

async function upsertBill(bill: ScrapedBill) {
  await prisma.bill.upsert({
    where: { aphUrl: bill.aphUrl },
    create: {
      title: bill.title,
      aphUrl: bill.aphUrl,
      chamber: bill.chamber,
      status: bill.status,
      sponsorName: bill.sponsorName,
      portfolio: bill.portfolio,
      introducedAt: bill.introducedAt,
      lastUpdatedAt: new Date(),
    },
    update: {
      status: bill.status,
      sponsorName: bill.sponsorName,
      portfolio: bill.portfolio,
      lastUpdatedAt: new Date(),
    },
  });
}

async function fetchOpenAustraliaMembers() {
  console.log("Fetching MP data from OpenAustralia...");
  try {
    const res = await fetch(`${OA_API_BASE}/getMPs?key=${OA_API_KEY}&output=js`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.pwmps || [];
  } catch (e) {
    console.warn("OpenAustralia API unavailable:", e);
    return [];
  }
}

async function upsertElectorates(members: any[]) {
  for (const mp of members) {
    if (!mp.constituency) continue;
    await prisma.electorate.upsert({
      where: { name: mp.constituency },
      create: {
        id: mp.constituency.toLowerCase().replace(/\s+/g, "-"),
        name: mp.constituency,
        state: mp.region || "",
        mpName: `${mp.first_name} ${mp.last_name}`,
        mpParty: mp.party,
      },
      update: {
        mpName: `${mp.first_name} ${mp.last_name}`,
        mpParty: mp.party,
      },
    });
  }
}

async function main() {
  console.log("Starting Crossbench bill ingestion...");
  try {
    const bills = await scrapeAphBills();
    let inserted = 0, updated = 0;
    for (const bill of bills) {
      const existing = await prisma.bill.findUnique({ where: { aphUrl: bill.aphUrl } });
      await upsertBill(bill);
      if (existing) updated++; else inserted++;
    }
    console.log(`Bills: ${inserted} inserted, ${updated} updated`);
    const members = await fetchOpenAustraliaMembers();
    if (members.length > 0) {
      await upsertElectorates(members);
      console.log(`Updated ${members.length} electorate/MP records`);
    }
    console.log("Ingestion complete");
  } catch (e) {
    console.error("Ingestion failed:", e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
