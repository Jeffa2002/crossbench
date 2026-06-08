const test = require('node:test');
const assert = require('node:assert/strict');
const { createHmac } = require('node:crypto');

require('ts-node/register');

const { safeRelativeRedirect } = require('../src/lib/app-url.ts');
const { hasMpEntitlement } = require('../src/lib/mp-entitlement.ts');
const { createVerificationToken, readVerificationToken } = require('../src/lib/verification-token.ts');

function signedVerificationToken(payload, secret) {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', secret).update(encodedPayload).digest('hex');
  return `${encodedPayload}.${signature}`;
}

test('verification tokens are signed and bound to the requesting user', () => {
  process.env.NEXTAUTH_SECRET = 'test-secret';
  const token = createVerificationToken('electorate-1', '10 Example Street, Perth WA', 'user-1');

  assert.equal(readVerificationToken(token, 'user-1')?.electorateId, 'electorate-1');
  assert.equal(readVerificationToken(token, 'user-2'), null);
  assert.equal(readVerificationToken(`${token.slice(0, -1)}x`, 'user-1'), null);
});

test('expired verification tokens are rejected', () => {
  process.env.NEXTAUTH_SECRET = 'test-secret';
  const token = signedVerificationToken({
    electorateId: 'electorate-1',
    addressHash: 'address-hash',
    userId: 'user-1',
    exp: Date.now() - 1,
  }, process.env.NEXTAUTH_SECRET);

  assert.equal(readVerificationToken(token, 'user-1'), null);
});

test('login redirects only allow same-site relative paths', () => {
  assert.equal(safeRelativeRedirect('/mp-dashboard?subscribed=1'), '/mp-dashboard?subscribed=1');
  assert.equal(safeRelativeRedirect('https://evil.example/mp-dashboard'), '/');
  assert.equal(safeRelativeRedirect('//evil.example/mp-dashboard'), '/');
  assert.equal(safeRelativeRedirect(null), '/');
});

test('MP dashboard entitlement requires active subscription or unexpired trial', () => {
  const now = Date.UTC(2026, 0, 1);

  assert.equal(hasMpEntitlement({ subscriptionStatus: 'ACTIVE', trialEndsAt: null }, now), true);
  assert.equal(hasMpEntitlement({ subscriptionStatus: 'TRIAL', trialEndsAt: new Date(now + 1000) }, now), true);
  assert.equal(hasMpEntitlement({ subscriptionStatus: 'TRIAL', trialEndsAt: new Date(now - 1000) }, now), false);
  assert.equal(hasMpEntitlement({ subscriptionStatus: 'CANCELLED', trialEndsAt: new Date(now + 1000) }, now), false);
  assert.equal(hasMpEntitlement({ subscriptionStatus: 'PAST_DUE', trialEndsAt: null }, now), false);
});
