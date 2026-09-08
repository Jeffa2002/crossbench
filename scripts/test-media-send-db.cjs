const { execFileSync } = require('node:child_process');
const { readFileSync } = require('node:fs');
const { randomBytes } = require('node:crypto');
const assert = require('node:assert/strict');
require('ts-node').register({ compilerOptions: { module: 'CommonJS', moduleResolution: 'node' } });
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { createMediaSendHandlers } = require('../src/lib/media-send.ts');
const { createMediaSendStore } = require('../src/lib/media-send-store.ts');
const { MEDIA_CONTACTS } = require('../src/lib/media-outreach.ts');

async function main() {
  const container = `crossbench-media-test-${randomBytes(6).toString('hex')}`;
  let prisma;
  let started = false;
  try {
    execFileSync('docker', ['run', '--detach', '--rm', '--name', container, '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', '-p', '127.0.0.1::5432', 'postgres:16-alpine'], { stdio: 'pipe' });
    started = true;
    let ready = false;
    for (let attempt = 0; attempt < 40; attempt++) {
      try { execFileSync('docker', ['exec', container, 'pg_isready', '-U', 'postgres'], { stdio: 'pipe' }); ready = true; break; } catch {}
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    assert.equal(ready, true, 'Disposable PostgreSQL must be ready');
    const port = execFileSync('docker', ['port', container, '5432'], { encoding: 'utf8' }).trim().split(':').at(-1);
    assert.match(port, /^\d+$/);
    const sql = path => execFileSync('docker', ['exec', '-i', container, 'psql', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1'], { input: readFileSync(path), stdio: ['pipe', 'pipe', 'pipe'] });
    sql('prisma/migrations/20260610002000_add_outreach_email_log/migration.sql');
    execFileSync('docker', ['exec', '-i', container, 'psql', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1'], { input: `INSERT INTO "OutreachEmailLog" (id,campaign,"recipientEmail",subject,status,"updatedAt") VALUES ('historical','media_legacy','Historical@EXAMPLE.invalid','Old subject','SENT',NOW());`, stdio: ['pipe', 'pipe', 'pipe'] });
    sql('prisma/migrations/20260908090000_media_manual_send_audit/migration.sql');
    prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: `postgresql://postgres@127.0.0.1:${port}/postgres` }) });
    const store = createMediaSendStore(prisma);
    const historical = await store.previous('historical@example.invalid');
    assert.equal(historical.status, 'SENT');
    assert.equal(historical.sentBy, null);
    console.log('PASS additive migration preserves historical records; case-insensitive legacy lookup');

    const eligible = MEDIA_CONTACTS.filter(contact => contact.emailEvidence);
    let providerCalls = 0;
    const handlers = createMediaSendHandlers({
      ...store,
      admin: async () => ({ email: 'isolated-admin@example.invalid' }),
      configuration: () => ({ ready: true, from: 'Crossbench', replyTo: 'replies@example.invalid' }),
      now: () => new Date('2026-09-08T12:00:00Z'),
      deliver: async () => { providerCalls++; return { id: 'mock-accepted-id' }; },
    });
    const endpoint = 'https://www.crossbench.io/api/admin/media/send';
    const draft = await (await handlers.GET(new Request(`${endpoint}?contactId=${eligible[0].id}`))).json();
    const request = () => new Request(endpoint, { method: 'POST', headers: { origin: 'https://www.crossbench.io', 'content-type': 'application/json' }, body: JSON.stringify({ contactId: eligible[0].id, draftHash: draft.draftHash, confirmed: true }) });
    const results = await Promise.all(Array.from({ length: 4 }, () => handlers.POST(request())));
    assert.deepEqual(results.map(result => result.status).sort(), [200, 409, 409, 409]);
    assert.equal(providerCalls, 1);
    const sent = await prisma.outreachEmailLog.findFirst({ where: { recipientEmail: eligible[0].email.toLowerCase() } });
    assert.equal(sent.sentBy, 'isolated-admin@example.invalid');
    assert.equal(sent.textBody, draft.text);
    assert.equal(sent.resendId, 'mock-accepted-id');
    await store.record(sent.id, 'PENDING');
    assert.equal((await store.previous(eligible[0].email)).status, 'SENT');
    assert.equal((await handlers.POST(request())).status, 409);
    assert.equal(providerCalls, 1);
    console.log('PASS real database concurrency/unique constraint, actor/body audit, repeat prevention and accepted-status preservation');

    for (const [index, status] of ['SENT', 'PENDING', 'FAILED', 'SKIPPED'].entries()) {
      await prisma.outreachEmailLog.create({ data: { campaign: `media_legacy_${status}`, recipientEmail: eligible[index + 1].email.toUpperCase(), subject: 'Historic media attempt', status } });
      const state = await (await handlers.GET(new Request(`${endpoint}?contactId=${eligible[index + 1].id}`))).json();
      assert.equal(state.canSend, false);
      assert.equal(state.delivery.status, status);
    }
    console.log('PASS historical SENT/PENDING/FAILED/SKIPPED records block new attempts across campaigns and email casing; no real email provider used');
  } finally {
    await prisma?.$disconnect();
    if (started) execFileSync('docker', ['rm', '--force', container], { stdio: 'pipe' });
  }
}

main().catch(() => { console.error('Isolated media database validation failed'); process.exitCode = 1; });
