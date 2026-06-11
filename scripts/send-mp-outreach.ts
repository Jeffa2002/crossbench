#!/usr/bin/env npx tsx
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Resend } from 'resend';

const args = new Set(process.argv.slice(2));
const getArg = (name: string, fallback: string) => {
  const prefix = `${name}=`;
  return process.argv.find(arg => arg.startsWith(prefix))?.slice(prefix.length) ?? fallback;
};

const shouldSend = args.has('--send');
const allowIncomplete = args.has('--allow-incomplete');
const allowDuplicates = args.has('--allow-duplicates');
const force = args.has('--force');
const limit = Number.parseInt(getArg('--limit', '0'), 10) || undefined;
const delayMs = Number.parseInt(getArg('--delay-ms', '30000'), 10);
const chamber = getArg('--chamber', 'all').toLowerCase();
const onlyEmail = getArg('--only', '').toLowerCase();
const campaign = getArg('--campaign', 'mp_outreach_free_access_2026_06');
const sampleId = getArg('--sample-id', 'bean');
const testTo = getArg('--test-to', '');

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });
const resend = new Resend(process.env.RESEND_API_KEY);

type Recipient = {
  id: string;
  name: string;
  state: string;
  mpName: string | null;
  mpParty: string | null;
  mpEmail: string | null;
  mpChamber: string | null;
};

type OutreachLogStatus = 'PENDING' | 'SENT' | 'FAILED' | 'SKIPPED';

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function firstName(fullName: string | null) {
  if (!fullName) return '';
  return fullName
    .replace(/\b(Hon|Mr|Ms|Mrs|Dr|Senator|MP|KC|OAM|AM|AO)\b/gi, '')
    .replace(/,/g, ' ')
    .trim()
    .split(/\s+/)[0] ?? '';
}

function greeting(recipient: Recipient) {
  const name = firstName(recipient.mpName);
  return name ? `Dear ${name}` : 'Hello';
}

function dashboardPath(recipient: Recipient) {
  if (recipient.mpChamber === 'Senate') return 'https://www.crossbench.io/parliament?chamber=senate';
  return `https://www.crossbench.io/electorates/${recipient.id}`;
}

function buildEmail(recipient: Recipient) {
  const electorateLabel = recipient.mpChamber === 'Senate'
    ? `${recipient.state} Senate`
    : recipient.name;
  const subject = 'A note from Crossbench: we should have made this free from the start';
  const plain = `${greeting(recipient)},

I wanted to write personally with a simple admission: we got one part of our Crossbench launch wrong.

Crossbench is built around a classic chicken-and-egg problem. Voters are much more likely to engage when they can see that their elected representatives are present, interested, and willing to listen. At the same time, MPs and Senators need to see that the platform is worth their office's time before making it part of their public engagement toolkit.

In hindsight, we should have recognised that more clearly from day one.

So, first: we apologise for not making Crossbench free for MPs and Senators up front, and for a far longer period. We are correcting that now. Crossbench will be available free for all federal MPs and Senators for a minimum of 12 months.

Our reasoning is straightforward. Crossbench needs elected representatives on the platform before it can properly serve voters. When voters can see their MP or Senator is participating, it gives them a clearer reason to join, follow issues, ask questions, and engage constructively. For offices, it creates a new channel to understand public sentiment, communicate directly, and build trust outside the noise of traditional social media.

We also want to apologise for not properly introducing the founder behind Crossbench earlier. Trust matters, especially when a platform is asking elected representatives and their teams to try something new. My name is Jeffrey E, and if you would like to understand who is behind the product, why it was built, and how it can support your office, I would be very happy to arrange a short introductory call.

Crossbench is designed to become a practical engagement tool for Parliamentarians, staff, and the public. It gives voters a better way to follow federal issues and gives elected offices a structured, transparent way to be seen as present, listening, and engaged.

What your office can use now:

- See bill-by-bill public sentiment for ${electorateLabel}.
- Compare local verified responses with national Crossbench participation.
- Understand which bills are drawing support, concern, or confusion.
- Invite trusted @aph.gov.au staff to help manage your office dashboard.

Crossbench is not a scientific population poll, not party-affiliated, and not a replacement for direct constituent correspondence. It is a participation layer: verified Australians, real bills, aggregated results, and a clearer feedback loop between Parliament and the people affected by its decisions.

You can view the public profile for ${electorateLabel} here:
${dashboardPath(recipient)}

MP and Senator offices can sign in with an @aph.gov.au email to access the member dashboard:
https://www.crossbench.io/for-mps

If anything on your profile needs correcting, or if your office wants a walkthrough or founder introduction, just reply to this email and it will go into the Crossbench support queue.

Regards,
Jeffrey E
Founder, Crossbench
jeffrey.e@crossbench.io
https://www.crossbench.io`;

  const html = `<p>${greeting(recipient)},</p>
<p>I wanted to write personally with a simple admission: we got one part of our Crossbench launch wrong.</p>
<p>Crossbench is built around a classic chicken-and-egg problem. Voters are much more likely to engage when they can see that their elected representatives are present, interested, and willing to listen. At the same time, MPs and Senators need to see that the platform is worth their office's time before making it part of their public engagement toolkit.</p>
<p>In hindsight, we should have recognised that more clearly from day one.</p>
<p>So, first: we apologise for not making Crossbench free for MPs and Senators up front, and for a far longer period. We are correcting that now. <strong>Crossbench will be available free for all federal MPs and Senators for a minimum of 12 months.</strong></p>
<p>Our reasoning is straightforward. Crossbench needs elected representatives on the platform before it can properly serve voters. When voters can see their MP or Senator is participating, it gives them a clearer reason to join, follow issues, ask questions, and engage constructively. For offices, it creates a new channel to understand public sentiment, communicate directly, and build trust outside the noise of traditional social media.</p>
<p>We also want to apologise for not properly introducing the founder behind Crossbench earlier. Trust matters, especially when a platform is asking elected representatives and their teams to try something new. My name is <strong>Jeffrey E</strong>, and if you would like to understand who is behind the product, why it was built, and how it can support your office, I would be very happy to arrange a short introductory call.</p>
<p>Crossbench is designed to become a practical engagement tool for Parliamentarians, staff, and the public. It gives voters a better way to follow federal issues and gives elected offices a structured, transparent way to be seen as present, listening, and engaged.</p>
<p><strong>What your office can use now:</strong></p>
<ul>
  <li>See bill-by-bill public sentiment for ${electorateLabel}.</li>
  <li>Compare local verified responses with national Crossbench participation.</li>
  <li>Understand which bills are drawing support, concern, or confusion.</li>
  <li>Invite trusted @aph.gov.au staff to help manage your office dashboard.</li>
</ul>
<p>Crossbench is not a scientific population poll, not party-affiliated, and not a replacement for direct constituent correspondence. It is a participation layer: verified Australians, real bills, aggregated results, and a clearer feedback loop between Parliament and the people affected by its decisions.</p>
<p>You can view the public profile for ${electorateLabel} here:<br><a href="${dashboardPath(recipient)}">${dashboardPath(recipient)}</a></p>
<p>MP and Senator offices can sign in with an @aph.gov.au email to access the member dashboard:<br><a href="https://www.crossbench.io/for-mps">https://www.crossbench.io/for-mps</a></p>
<p>If anything on your profile needs correcting, or if your office wants a walkthrough or founder introduction, just reply to this email and it will go into the Crossbench support queue.</p>
<p>Regards,<br>Jeffrey E<br>Founder, Crossbench<br><a href="mailto:jeffrey.e@crossbench.io">jeffrey.e@crossbench.io</a><br><a href="https://www.crossbench.io">https://www.crossbench.io</a></p>`;

  return { subject, plain, html };
}

function splitEmails(value: string) {
  return value
    .split(',')
    .map(email => email.trim())
    .filter(Boolean);
}

function idempotencyKey(campaignName: string, recipient: Recipient, to: string) {
  const raw = `${campaignName}-${recipient.id}-${to.toLowerCase()}`;
  return raw.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 256);
}

function tagValue(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 256);
}

async function writeLog(recipient: Recipient, subject: string, status: OutreachLogStatus, resendId?: string, error?: string) {
  const recipientEmail = recipient.mpEmail!.toLowerCase();
  await (prisma as any).outreachEmailLog.upsert({
    where: { campaign_recipientEmail: { campaign, recipientEmail } },
    create: {
      campaign,
      electorateId: recipient.id,
      chamber: recipient.mpChamber,
      recipientName: recipient.mpName || recipient.name,
      recipientEmail,
      subject,
      status,
      resendId,
      error,
      sentAt: status === 'SENT' ? new Date() : null,
    },
    update: {
      electorateId: recipient.id,
      chamber: recipient.mpChamber,
      recipientName: recipient.mpName || recipient.name,
      subject,
      status,
      resendId,
      error,
      sentAt: status === 'SENT' ? new Date() : undefined,
    },
  });
}

async function main() {
  if (shouldSend && !process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY is required when using --send');
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');

  const chamberFilter =
    chamber === 'house' ? ['House of Reps']
    : chamber === 'senate' ? ['Senate']
    : ['House of Reps', 'Senate'];

  let recipients: Recipient[];
  const testRecipients = splitEmails(testTo);
  if (testRecipients.length) {
    const sample = await prisma.electorate.findUnique({
      where: { id: sampleId },
      select: {
        id: true,
        name: true,
        state: true,
        mpName: true,
        mpParty: true,
        mpEmail: true,
        mpChamber: true,
      },
    });
    if (!sample) throw new Error(`Sample electorate/member not found: ${sampleId}`);
    recipients = testRecipients.map(email => ({
      ...sample,
      mpEmail: email,
    }));
  } else {
    recipients = await prisma.electorate.findMany({
      where: {
        mpChamber: { in: chamberFilter },
        ...(onlyEmail ? { mpEmail: { equals: onlyEmail, mode: 'insensitive' } } : {}),
      },
      select: {
        id: true,
        name: true,
        state: true,
        mpName: true,
        mpParty: true,
        mpEmail: true,
        mpChamber: true,
      },
      orderBy: [{ mpChamber: 'asc' }, { state: 'asc' }, { name: 'asc' }],
      ...(limit ? { take: limit } : {}),
    });
  }

  const deliverable = recipients.filter(r => r.mpEmail);
  const missingEmail = recipients.length - deliverable.length;
  const emailCounts = new Map<string, number>();
  for (const recipient of deliverable) {
    const email = recipient.mpEmail!.toLowerCase();
    emailCounts.set(email, (emailCounts.get(email) ?? 0) + 1);
  }
  const duplicateEmails = [...emailCounts.entries()].filter(([, count]) => count > 1);
  const replyTo = process.env.MP_OUTREACH_REPLY_TO || 'support+mp-outreach@crossbench.io';
  const from = process.env.MP_OUTREACH_FROM || 'Crossbench <noreply@crossbench.io>';

  console.log(`${shouldSend ? 'SEND' : 'DRY RUN'} mode`);
  console.log(`Recipients selected: ${recipients.length}`);
  console.log(`Deliverable recipients: ${deliverable.length}`);
  console.log(`Skipped missing email: ${missingEmail}`);
  console.log(`Duplicate email mappings: ${duplicateEmails.length}`);
  console.log(`From: ${from}`);
  console.log(`Reply-To: ${replyTo}`);
  console.log(`Campaign: ${campaign}`);
  if (testRecipients.length) console.log(`Test recipients: ${testRecipients.join(', ')}`);
  console.log(`Delay: ${delayMs}ms`);

  if (duplicateEmails.length) {
    console.log('\nDuplicate addresses that need review:');
    for (const [email] of duplicateEmails.slice(0, 20)) {
      const rows = deliverable
        .filter(recipient => recipient.mpEmail!.toLowerCase() === email)
        .map(recipient => `${recipient.name} / ${recipient.mpName || 'No member name'}`)
        .join('; ');
      console.log(`- ${email}: ${rows}`);
    }
  }

  if (shouldSend && missingEmail > 0 && !allowIncomplete) {
    throw new Error(`Refusing to send: ${missingEmail} selected recipients are missing mpEmail. Use --allow-incomplete only after approving a partial send.`);
  }
  if (shouldSend && duplicateEmails.length > 0 && !allowDuplicates) {
    throw new Error(`Refusing to send: ${duplicateEmails.length} duplicate email mappings need review. Use --allow-duplicates only after fixing or approving them.`);
  }

  for (let i = 0; i < deliverable.length; i++) {
    const recipient = deliverable[i];
    const email = buildEmail(recipient);
    const to = recipient.mpEmail!;
    console.log(`[${i + 1}/${deliverable.length}] ${recipient.mpName || recipient.name} <${to}>`);

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
      select: { status: true, resendId: true, sentAt: true },
    });
    if (existingLog?.status === 'SENT' && !force) {
      console.log(`  skipped: already sent (${existingLog.resendId || 'no resend id'})`);
      continue;
    }

    await writeLog(recipient, email.subject, 'PENDING');
    const { data, error } = await resend.emails.send({
      from,
      to,
      replyTo,
      subject: email.subject,
      text: email.plain,
      html: email.html,
      tags: [
        { name: 'campaign', value: tagValue(campaign) },
        { name: 'electorate', value: tagValue(recipient.id) },
      ],
    }, {
      idempotencyKey: idempotencyKey(campaign, recipient, to),
    });

    if (error) {
      await writeLog(recipient, email.subject, 'FAILED', undefined, error.message);
      console.error(`  failed: ${error.message}`);
    } else {
      await writeLog(recipient, email.subject, 'SENT', data?.id);
      console.log(`  sent${data?.id ? ` (${data.id})` : ''}`);
    }

    if (i < deliverable.length - 1) await sleep(delayMs);
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
