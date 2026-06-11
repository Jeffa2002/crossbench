const test = require('node:test');
const assert = require('node:assert/strict');
const { createHmac } = require('node:crypto');

require('ts-node/register');

const { safeRelativeRedirect } = require('../src/lib/app-url.ts');
const { hasMpEntitlement } = require('../src/lib/mp-entitlement.ts');
const { isClearlyAutomaticSupportReply } = require('../src/lib/support-auto-reply.ts');
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

test('MP dashboard entitlement is open during free early access', () => {
  const now = Date.UTC(2026, 0, 1);

  assert.equal(hasMpEntitlement({ subscriptionStatus: 'ACTIVE', trialEndsAt: null }, now), true);
  assert.equal(hasMpEntitlement({ subscriptionStatus: 'TRIAL', trialEndsAt: new Date(now + 1000) }, now), true);
  assert.equal(hasMpEntitlement({ subscriptionStatus: 'TRIAL', trialEndsAt: new Date(now - 1000) }, now), true);
  assert.equal(hasMpEntitlement({ subscriptionStatus: 'CANCELLED', trialEndsAt: new Date(now + 1000) }, now), true);
  assert.equal(hasMpEntitlement({ subscriptionStatus: 'PAST_DUE', trialEndsAt: null }, now), true);
});

test('support inbound detection closes only clear automatic replies', () => {
  assert.equal(isClearlyAutomaticSupportReply({
    subject: 'Automatic reply: Parliamentary office',
    body: 'Thank you for your email.',
  }), true);

  assert.equal(isClearlyAutomaticSupportReply({
    subject: 'Re: Crossbench introduction',
    body: 'Thank you for your email. I am currently out of the office and will return next week.',
  }), true);

  assert.equal(isClearlyAutomaticSupportReply({
    subject: 'Re: Crossbench introduction',
    body: 'Thanks for getting in touch. Could you send through a few times for a call?',
  }), false);
});
