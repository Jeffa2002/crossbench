const test = require('node:test');
const assert = require('node:assert/strict');

require('ts-node/register');

const { signPageView, verifyPageViewToken } = require('../src/lib/analytics-token.ts');
const {
  hashPassword,
  verifyPassword,
  generateTotpSecret,
  verifyTotp,
} = require('../src/lib/admin-crypto.ts');
const { createHmac } = require('node:crypto');

// ---- C-01: analytics pageview token ----

test('C-01: pageview token round-trips and binds id + session', () => {
  process.env.ANALYTICS_TOKEN_SECRET = 'test-analytics-secret';
  const token = signPageView('view-123', 'session-abc');
  const decoded = verifyPageViewToken(token);
  assert.equal(decoded?.pageViewId, 'view-123');
  assert.equal(decoded?.sessionId, 'session-abc');
});

test('C-01: tampered or forged pageview tokens are rejected', () => {
  process.env.ANALYTICS_TOKEN_SECRET = 'test-analytics-secret';
  const token = signPageView('view-123', 'session-abc');

  // flipped last char of signature
  assert.equal(verifyPageViewToken(`${token.slice(0, -1)}${token.slice(-1) === 'a' ? 'b' : 'a'}`), null);
  // raw id with no signature (the old, forgeable format)
  assert.equal(verifyPageViewToken('view-123'), null);
  // empty / wrong types
  assert.equal(verifyPageViewToken(''), null);
  assert.equal(verifyPageViewToken(undefined), null);
  assert.equal(verifyPageViewToken(42), null);
  // signature computed with a different secret must not validate
  const payload = Buffer.from('view-123:session-abc').toString('base64url');
  const forged = `${payload}.${createHmac('sha256', 'wrong-secret').update(payload).digest('base64url')}`;
  assert.equal(verifyPageViewToken(forged), null);
});

// ---- C-04: admin password hashing ----

test('C-04: password hashing verifies correct password and rejects wrong', () => {
  const stored = hashPassword('correct horse battery staple');
  assert.ok(stored.startsWith('scrypt$'));
  assert.equal(verifyPassword('correct horse battery staple', stored), true);
  assert.equal(verifyPassword('wrong password', stored), false);
  // garbage stored value never throws, just returns false
  assert.equal(verifyPassword('anything', 'not-a-valid-hash'), false);
});

test('C-04: two hashes of the same password differ (salted)', () => {
  const a = hashPassword('same-password');
  const b = hashPassword('same-password');
  assert.notEqual(a, b);
  assert.equal(verifyPassword('same-password', a), true);
  assert.equal(verifyPassword('same-password', b), true);
});

// ---- C-04: TOTP (RFC 6238) ----

// Reference implementation to generate the current code for a secret.
const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function base32Decode(secret) {
  let bits = '';
  for (const ch of secret.toUpperCase()) {
    const idx = BASE32.indexOf(ch);
    if (idx === -1) continue;
    bits += idx.toString(2).padStart(5, '0');
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}
function totpNow(secret, offset = 0) {
  const key = base32Decode(secret);
  const counter = Math.floor(Date.now() / 1000 / 30) + offset;
  const buf = Buffer.alloc(8);
  buf.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  buf.writeUInt32BE(counter >>> 0, 4);
  const hmac = createHmac('sha1', key).update(buf).digest();
  const o = hmac[hmac.length - 1] & 0xf;
  const code =
    ((hmac[o] & 0x7f) << 24) | ((hmac[o + 1] & 0xff) << 16) | ((hmac[o + 2] & 0xff) << 8) | (hmac[o + 3] & 0xff);
  return (code % 1_000_000).toString().padStart(6, '0');
}

test('C-04: TOTP accepts the current code and rejects a wrong one', () => {
  const secret = generateTotpSecret();
  assert.match(secret, /^[A-Z2-7]+$/);
  assert.equal(verifyTotp(secret, totpNow(secret)), true);
  assert.equal(verifyTotp(secret, '000000'), false);
  assert.equal(verifyTotp(secret, 'abc'), false);
  assert.equal(verifyTotp(secret, ''), false);
});

test('C-04: TOTP tolerates +/-1 step clock skew but not beyond', () => {
  const secret = generateTotpSecret();
  assert.equal(verifyTotp(secret, totpNow(secret, -1)), true);
  assert.equal(verifyTotp(secret, totpNow(secret, 1)), true);
  // two steps away should fail (outside the +/-1 window)
  assert.equal(verifyTotp(secret, totpNow(secret, 2)), false);
});
