const test = require('node:test');
const assert = require('node:assert/strict');
require('ts-node').register({ compilerOptions: { module: 'CommonJS', moduleResolution: 'node' } });
const { createMediaSendHandlers } = require('../src/lib/media-send.ts');
const { MEDIA_CONTACTS } = require('../src/lib/media-outreach.ts');

const contact = MEDIA_CONTACTS.find(entry => entry.emailEvidence);
const endpoint = 'https://www.crossbench.io/api/admin/media/send';

function fixture(overrides = {}) {
  const records = new Map();
  const deliveries = [];
  const dependencies = {
    admin: async () => ({ email: 'operator@example.invalid' }),
    configuration: () => ({ ready: true, from: 'Crossbench <noreply@crossbench.io>', replyTo: 'support+media@crossbench.io' }),
    now: () => new Date('2026-09-08T12:00:00Z'),
    previous: async email => records.get(email) || null,
    claim: async data => {
      if (records.has(data.recipientEmail)) throw Object.assign(new Error('duplicate'), { code: 'P2002' });
      const entry = { ...data, id: `record-${records.size}`, status: 'PENDING', sentAt: null };
      records.set(data.recipientEmail, entry);
      return entry;
    },
    record: async (id, status, providerId) => {
      const entry = [...records.values()].find(record => record.id === id);
      Object.assign(entry, { status, providerId, sentAt: status === 'SENT' ? new Date() : null });
    },
    deliver: async (mail, key) => { deliveries.push({ mail, key }); return { id: 'mock-provider-id' }; },
    ...overrides,
  };
  const handlers = createMediaSendHandlers(dependencies);
  return { handlers, dependencies, records, deliveries };
}

async function preview(current, contactId = contact.id) {
  return current.handlers.GET(new Request(`${endpoint}?contactId=${contactId}`));
}

function post(current, body, headers = {}) {
  return current.handlers.POST(new Request(endpoint, { method: 'POST', headers: { origin: 'https://www.crossbench.io', 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) }));
}

async function confirmation(current, contactId = contact.id) {
  const draft = await (await preview(current, contactId)).json();
  return { contactId, draftHash: draft.draftHash, confirmed: true };
}

test('manual send preview is read-only and exposes exact single-recipient draft', async () => {
  const current = fixture();
  const result = await preview(current);
  const draft = await result.json();
  assert.equal(result.headers.get('cache-control'), 'no-store');
  assert.equal(draft.canSend, true);
  assert.equal(draft.recipient, contact.email.toLowerCase());
  assert.match(draft.text, /self-selected, not representative polling/);
  assert.equal(current.deliveries.length, 0);
  assert.equal(current.records.size, 0);
});

test('both manual media methods require server-side admin authentication', async () => {
  const current = fixture({ admin: async () => null });
  assert.equal((await preview(current)).status, 401);
  assert.equal((await post(current, {})).status, 401);
  assert.equal(current.records.size, 0);
  assert.equal(current.deliveries.length, 0);
});

test('cross-origin, absent-origin, cross-site and non-JSON sends are rejected', async () => {
  const current = fixture();
  const body = await confirmation(current);
  for (const headers of [{ origin: 'https://attacker.invalid' }, { origin: '' }, { 'sec-fetch-site': 'cross-site' }]) {
    assert.equal((await post(current, body, headers)).status, 403);
  }
  assert.equal((await post(current, body, { 'content-type': 'text/plain' })).status, 415);
  assert.equal(current.deliveries.length, 0);
});

test('manual endpoint rejects missing confirmation, arrays, recipient overrides and bulk flags', async () => {
  const current = fixture();
  const body = await confirmation(current);
  for (const invalid of [null, [], [body], {}, { ...body, confirmed: false }, { ...body, contactId: [contact.id] }, { ...body, to: 'other@example.invalid' }, { ...body, contactIds: [contact.id] }, { ...body, subject: 'Changed' }, { ...body, text: 'Changed' }, { ...body, force: true }]) {
    assert.equal((await post(current, invalid)).status, 400);
  }
  assert.equal(current.deliveries.length, 0);
});

test('oversized and malformed confirmations fail without recording or sending', async () => {
  const current = fixture();
  assert.equal((await post(current, { contactId: 'x'.repeat(3000) })).status, 413);
  const result = await current.handlers.POST(new Request(endpoint, { method: 'POST', headers: { origin: 'https://www.crossbench.io', 'content-type': 'application/json' }, body: '{' }));
  assert.equal(result.status, 400);
  assert.equal(current.records.size, 0);
});

test('missing contacts, unsourced addresses, expired evidence and changed drafts cannot send', async () => {
  const current = fixture();
  assert.equal((await preview(current, 'missing')).status, 404);
  assert.equal((await post(current, { contactId: 'missing', confirmed: true, draftHash: 'x' })).status, 404);
  const missingEmail = MEDIA_CONTACTS.find(entry => !entry.email);
  assert.equal((await post(current, await confirmation(current, missingEmail.id))).status, 422);
  assert.equal((await post(current, { ...await confirmation(current), draftHash: 'changed' })).status, 409);
  const expired = fixture({ now: () => new Date('2027-01-01T00:00:00Z') });
  assert.equal((await post(expired, await confirmation(expired))).status, 422);
  assert.equal(current.deliveries.length + expired.deliveries.length, 0);
});

test('email-provider configuration or sender changes fail closed before reserving a delivery', async () => {
  const current = fixture({ configuration: () => ({ ready: false, from: 'Crossbench', replyTo: 'support@crossbench.io' }) });
  assert.equal((await (await preview(current)).json()).canSend, false);
  assert.equal((await post(current, await confirmation(current))).status, 503);
  assert.equal(current.records.size, 0);
  let sender = 'Original';
  const changed = fixture({ configuration: () => ({ ready: true, from: sender, replyTo: 'support@crossbench.io' }) });
  const body = await confirmation(changed);
  sender = 'Changed';
  assert.equal((await post(changed, body)).status, 409);
});

test('one confirmed send records actor and exact draft and uses provider idempotency', async () => {
  const current = fixture();
  const result = await post(current, await confirmation(current));
  assert.equal(result.status, 200);
  assert.match((await result.json()).message, /Inbox delivery is not yet confirmed/);
  assert.equal(current.deliveries.length, 1);
  assert.equal(current.deliveries[0].mail.to, contact.email.toLowerCase());
  assert.equal(typeof current.deliveries[0].mail.to, 'string');
  const record = current.records.get(contact.email.toLowerCase());
  assert.equal(record.status, 'SENT');
  assert.equal(record.sentBy, 'operator@example.invalid');
  assert.equal(record.textBody, current.deliveries[0].mail.text);
  assert.equal(current.deliveries[0].key, `media-${record.id}`);
  assert.equal((await (await preview(current)).json()).canSend, false);
  assert.equal((await post(current, await confirmation(current))).status, 409);
  assert.equal(current.deliveries.length, 1);
});

test('concurrent confirmations can claim only one delivery record', async () => {
  const current = fixture();
  const body = await confirmation(current);
  const results = await Promise.all([post(current, body), post(current, body), post(current, body)]);
  assert.deepEqual(results.map(result => result.status).sort(), [200, 409, 409]);
  assert.equal(current.records.size, 1);
  assert.equal(current.deliveries.length, 1);
});

test('historical sent, pending, failed and skipped records all block repeat sending', async () => {
  for (const status of ['SENT', 'PENDING', 'FAILED', 'SKIPPED']) {
    const current = fixture({ previous: async () => ({ id: 'old', status, sentBy: null, sentAt: null }) });
    assert.equal((await (await preview(current)).json()).canSend, false);
    assert.equal((await post(current, await confirmation(current))).status, 409);
    assert.equal(current.deliveries.length, 0);
  }
});

test('provider rejection is recorded without retries', async () => {
  const current = fixture({ deliver: async () => ({ rejected: true }) });
  const body = await confirmation(current);
  assert.equal((await post(current, body)).status, 502);
  assert.equal(current.records.get(contact.email.toLowerCase()).status, 'FAILED');
  assert.equal((await post(current, body)).status, 409);
});

test('provider timeouts and missing acknowledgements remain uncertain and cannot retry', async () => {
  for (const deliver of [async () => { throw new Error('timeout'); }, async () => ({})]) {
    const current = fixture({ deliver });
    const body = await confirmation(current);
    const result = await post(current, body);
    assert.equal(result.status, 503);
    assert.match((await result.json()).error, /uncertain/);
    assert.equal(current.records.get(contact.email.toLowerCase()).status, 'PENDING');
    assert.equal((await post(current, body)).status, 409);
  }
});

test('history or reservation failures never call the email provider', async () => {
  const current = fixture({ previous: async () => { throw new Error('database unavailable'); } });
  assert.equal((await preview(current)).status, 503);
  const healthy = fixture();
  const body = await confirmation(healthy);
  assert.equal((await post(current, body)).status, 503);
  const reservationFailure = fixture({ claim: async () => { throw new Error('database unavailable'); } });
  assert.equal((await post(reservationFailure, body)).status, 503);
  assert.equal(current.deliveries.length + reservationFailure.deliveries.length, 0);
});

test('lost database acknowledgement after provider acceptance never releases the duplicate guard', async () => {
  const current = fixture({ record: async () => { throw new Error('database unavailable'); } });
  const body = await confirmation(current);
  assert.equal((await post(current, body)).status, 503);
  assert.equal(current.deliveries.length, 1);
  assert.equal(current.records.get(contact.email.toLowerCase()).status, 'PENDING');
  assert.equal((await post(current, body)).status, 409);
  assert.equal(current.deliveries.length, 1);
});
