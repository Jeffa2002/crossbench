#!/usr/bin/env npx tsx
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Resend } from 'resend';
import { MEDIA_CONTACTS, MediaContact, buildMediaOutreachEmail } from '../src/lib/media-outreach';

const args = new Set(process.argv.slice(2));
const getArg = (name: string, fallback: string) => {
  const prefix = `${name}=`;
  return process.argv.find(arg => arg.startsWith(prefix))?.slice(prefix.length) ?? fallback;
};

const shouldSend = args.has('--send');
const force = args.has('--force');
const limit = Number.parseInt(getArg('--limit', '0'), 10) || undefined;
const delayMs = Number.parseInt(getArg('--delay-ms', '30000'), 10);
const only = getArg('--only', '').toLowerCase();
const campaign = getArg('--campaign', 'media_outreach_intro_2026_06');
const sampleId = getArg('--sample-id', 'david-speers');
const testTo = getArg('--test-to', '');

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });
const resend = new Resend(process.env.RESEND_API_KEY);

type OutreachLogStatus = 'PENDING' | 'SENT' | 'FAILED' | 'SKIPPED';

type Recipient = MediaContact & {
  recipientEmail: string;
};

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function splitEmails(value: string) {
  return value
    .split(',')
    .map(email => email.trim())
    .filter(Boolean);
}

function idempotencyKey(campaignName: string, contact: MediaContact, to: string) {
  const raw = `${campaignName}-${contact.id}-${to.toLowerCase()}`;
  return raw.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 256);
}

async function writeLog(contact: MediaContact, recipientEmail: string, subject: string, status: OutreachLogStatus, resendId?: string, error?: string) {
  const email = recipientEmail.toLowerCase();
  await (prisma as any).outreachEmailLog.upsert({
    where: { campaign_recipientEmail: { campaign, recipientEmail: email } },
    create: {
      campaign,
      chamber: 'Media',
      recipientName: contact.name,
      recipientEmail: email,
      subject,
      status,
      resendId,
      error,
      sentAt: status === 'SENT' ? new Date() : null,
    },
    update: {
      chamber: 'Media',
      recipientName: contact.name,
      subject,
      status,
      resendId,
      error,
      sentAt: status === 'SENT' ? new Date() : undefined,
    },
  });
}

function getRecipients(): Recipient[] {
  const testRecipients = splitEmails(testTo);
  if (testRecipients.length) {
    const sample = MEDIA_CONTACTS.find(contact => contact.id === sampleId);
    if (!sample) throw new Error(`Sample media contact not found: ${sampleId}`);
    return testRecipients.map(email => ({ ...sample, recipientEmail: email }));
  }

  const filtered = MEDIA_CONTACTS
    .filter(contact => !only || contact.id === only || contact.name.toLowerCase().includes(only) || contact.outlet.toLowerCase().includes(only))
    .filter(contact => contact.email)
    .map(contact => ({ ...contact, recipientEmail: contact.email! }));

  return limit ? filtered.slice(0, limit) : filtered;
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  if (shouldSend && !process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY is required when using --send');

  const recipients = getRecipients();
  const missingEmail = MEDIA_CONTACTS.filter(contact => !contact.email).length;
  const replyTo = process.env.MEDIA_OUTREACH_REPLY_TO || 'support+media@crossbench.io';
  const from = process.env.MEDIA_OUTREACH_FROM || process.env.MP_OUTREACH_FROM || 'Crossbench <noreply@crossbench.io>';

  console.log(`${shouldSend ? 'SEND' : 'DRY RUN'} mode`);
  console.log(`Contacts researched: ${MEDIA_CONTACTS.length}`);
  console.log(`Deliverable recipients: ${recipients.length}`);
  console.log(`Contacts missing verified email: ${missingEmail}`);
  console.log(`From: ${from}`);
  console.log(`Reply-To: ${replyTo}`);
  console.log(`Campaign: ${campaign}`);
  if (testTo) console.log(`Test recipients: ${splitEmails(testTo).join(', ')}`);
  console.log(`Delay: ${delayMs}ms`);

  if (shouldSend && recipients.length === 0) {
    throw new Error('Refusing to send: no media contacts have verified recipient emails. Use --test-to for previews or add verified emails first.');
  }

  for (let i = 0; i < recipients.length; i++) {
    const contact = recipients[i];
    const email = buildMediaOutreachEmail(contact);
    const to = contact.recipientEmail;
    console.log(`[${i + 1}/${recipients.length}] ${contact.name} / ${contact.outlet} <${to}>`);

    if (!shouldSend) {
      if (i === 0) {
        console.log('\n--- Sample subject ---');
        console.log(email.subject);
        console.log('\n--- Sample text ---');
        console.log(email.plain);
        console.log('--- End sample ---\n');
      }
      continue;
    }

    const existingLog = await (prisma as any).outreachEmailLog.findUnique({
      where: { campaign_recipientEmail: { campaign, recipientEmail: to.toLowerCase() } },
      select: { status: true, resendId: true },
    });
    if (existingLog?.status === 'SENT' && !force) {
      console.log(`  skipped: already sent (${existingLog.resendId || 'no resend id'})`);
      continue;
    }

    await writeLog(contact, to, email.subject, 'PENDING');
    const { data, error } = await resend.emails.send({
      from,
      to,
      replyTo,
      subject: email.subject,
      text: email.plain,
      html: email.html,
      tags: [
        { name: 'campaign', value: campaign.slice(0, 256) },
        { name: 'contact', value: contact.id.slice(0, 256) },
      ],
    }, {
      idempotencyKey: idempotencyKey(campaign, contact, to),
    });

    if (error) {
      await writeLog(contact, to, email.subject, 'FAILED', undefined, error.message);
      console.error(`  failed: ${error.message}`);
    } else {
      await writeLog(contact, to, email.subject, 'SENT', data?.id);
      console.log(`  sent${data?.id ? ` (${data.id})` : ''}`);
    }

    if (i < recipients.length - 1) await sleep(delayMs);
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
