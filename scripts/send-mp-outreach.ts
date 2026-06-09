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
const limit = Number.parseInt(getArg('--limit', '0'), 10) || undefined;
const delayMs = Number.parseInt(getArg('--delay-ms', '30000'), 10);
const chamber = getArg('--chamber', 'all').toLowerCase();
const onlyEmail = getArg('--only', '').toLowerCase();

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
  if (recipient.mpChamber === 'Senate') return 'https://crossbench.io/parliament?chamber=senate';
  return `https://crossbench.io/electorates/${recipient.id}`;
}

function buildEmail(recipient: Recipient) {
  const electorateLabel = recipient.mpChamber === 'Senate'
    ? `${recipient.state} Senate`
    : recipient.name;
  const subject = 'Introducing Crossbench for your electorate';
  const plain = `${greeting(recipient)},

I am writing to introduce Crossbench, an independent civic platform built to help Australians understand federal bills and show their position on them in a structured, electorate-aware way.

Crossbench gives voters plain-English explanations of bills before Parliament, lets them record whether they support, oppose, or abstain, and verifies electorate information so results can be shown in aggregate by seat. For MPs and Senators, the goal is simple: a clearer live signal of what participating constituents are saying about legislation, without exposing individual voters.

What your office can use it for:

- See bill-by-bill public sentiment for ${electorateLabel}.
- Compare local verified responses with national Crossbench participation.
- Understand which bills are drawing support, concern, or confusion.
- Give your constituents another practical way to engage with current legislation.

Crossbench is not a scientific population poll, not party-affiliated, and not a replacement for direct constituent correspondence. It is a participation layer: verified Australians, real bills, aggregated results, and a clearer feedback loop between Parliament and the people affected by its decisions.

You can view the public profile for ${electorateLabel} here:
${dashboardPath(recipient)}

MP and Senator offices can sign in with an @aph.gov.au email to access the member dashboard:
https://crossbench.io/for-mps

If anything on your profile needs correcting, or if your office wants a walkthrough, just reply to this email and it will go into the Crossbench support queue.

Regards,
Crossbench
https://crossbench.io`;

  const html = `<p>${greeting(recipient)},</p>
<p>I am writing to introduce <strong>Crossbench</strong>, an independent civic platform built to help Australians understand federal bills and show their position on them in a structured, electorate-aware way.</p>
<p>Crossbench gives voters plain-English explanations of bills before Parliament, lets them record whether they support, oppose, or abstain, and verifies electorate information so results can be shown in aggregate by seat. For MPs and Senators, the goal is simple: a clearer live signal of what participating constituents are saying about legislation, without exposing individual voters.</p>
<p><strong>What your office can use it for:</strong></p>
<ul>
  <li>See bill-by-bill public sentiment for ${electorateLabel}.</li>
  <li>Compare local verified responses with national Crossbench participation.</li>
  <li>Understand which bills are drawing support, concern, or confusion.</li>
  <li>Give your constituents another practical way to engage with current legislation.</li>
</ul>
<p>Crossbench is not a scientific population poll, not party-affiliated, and not a replacement for direct constituent correspondence. It is a participation layer: verified Australians, real bills, aggregated results, and a clearer feedback loop between Parliament and the people affected by its decisions.</p>
<p>You can view the public profile for ${electorateLabel} here:<br><a href="${dashboardPath(recipient)}">${dashboardPath(recipient)}</a></p>
<p>MP and Senator offices can sign in with an @aph.gov.au email to access the member dashboard:<br><a href="https://crossbench.io/for-mps">https://crossbench.io/for-mps</a></p>
<p>If anything on your profile needs correcting, or if your office wants a walkthrough, just reply to this email and it will go into the Crossbench support queue.</p>
<p>Regards,<br>Crossbench<br><a href="https://crossbench.io">https://crossbench.io</a></p>`;

  return { subject, plain, html };
}

async function main() {
  if (shouldSend && !process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY is required when using --send');
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');

  const chamberFilter =
    chamber === 'house' ? ['House of Reps']
    : chamber === 'senate' ? ['Senate']
    : ['House of Reps', 'Senate'];

  const recipients = await prisma.electorate.findMany({
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

    const { error } = await resend.emails.send({
      from,
      to,
      replyTo,
      subject: email.subject,
      text: email.plain,
      html: email.html,
      tags: [
        { name: 'campaign', value: 'mp_outreach_intro' },
        { name: 'electorate', value: recipient.id.slice(0, 256) },
      ],
    }, {
      idempotencyKey: `mp-outreach-intro-${recipient.id}`,
    });

    if (error) {
      console.error(`  failed: ${error.message}`);
    } else {
      console.log('  sent');
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
