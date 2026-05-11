// /scripts/check-bill-alerts.js
// Runs via cron to check for new bills matching user alerts
// Usage: node scripts/check-bill-alerts.js

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID;

async function sendTelegramMessage(chatId, message) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
  });
  return response.json();
}

async function checkAlerts() {
  console.log(`[${new Date().toISOString()}] Checking bill alerts...`);

  // Get all active alerts
  const alerts = await prisma.billAlert.findMany({
    where: { isActive: true },
    include: {
      user: { select: { email: true, name: true } },
      notifications: { select: { billId: true } },
    },
  });

  if (alerts.length === 0) {
    console.log('No active alerts found');
    return;
  }

  console.log(`Found ${alerts.length} active alerts`);

  // Get bills from last 7 days (to catch any we might have missed)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentBills = await prisma.bill.findMany({
    where: {
      OR: [
        { createdAt: { gte: sevenDaysAgo } },
        { lastUpdatedAt: { gte: sevenDaysAgo } },
      ],
    },
    select: {
      id: true,
      title: true,
      summary: true,
      aiSummary: true,
      status: true,
      chamber: true,
      aphUrl: true,
    },
  });

  console.log(`Found ${recentBills.length} bills from last 7 days`);

  const notificationsSent = [];

  for (const alert of alerts) {
    const keyword = alert.keyword.toLowerCase();
    const alreadyNotified = new Set(alert.notifications.map((n) => n.billId));

    for (const bill of recentBills) {
      // Skip if already notified
      if (alreadyNotified.has(bill.id)) continue;

      // Check if keyword matches title, summary, or AI summary
      const searchText = [
        bill.title,
        bill.summary || '',
        bill.aiSummary || '',
      ].join(' ').toLowerCase();

      if (searchText.includes(keyword)) {
        // Match found! Record and notify
        console.log(`Match: "${alert.keyword}" -> "${bill.title}"`);

        // Create notification record
        await prisma.billAlertNotification.create({
          data: {
            alertId: alert.id,
            billId: bill.id,
          },
        });

        // Update last notified time
        await prisma.billAlert.update({
          where: { id: alert.id },
          data: { lastNotifiedAt: new Date() },
        });

        notificationsSent.push({
          user: alert.user,
          keyword: alert.keyword,
          bill,
        });
      }
    }
  }

  // Send Telegram summary to admin
  if (notificationsSent.length > 0) {
    const message = `🔔 <b>Crossbench Bill Alerts</b>\n\n${notificationsSent
      .map(
        (n) =>
          `<b>${n.user.email}</b> matched "<i>${n.keyword}</i>":\n` +
          `📋 ${n.bill.title}\n` +
          `🔗 https://crossbench.io/bills/${n.bill.id}`
      )
      .join('\n\n')}`;

    await sendTelegramMessage(TELEGRAM_ADMIN_CHAT_ID, message);
    console.log(`Sent ${notificationsSent.length} notifications to Telegram`);
  } else {
    console.log('No new matches found');
  }

  await prisma.$disconnect();
}

checkAlerts().catch((err) => {
  console.error('Error checking alerts:', err);
  prisma.$disconnect();
  process.exit(1);
});
