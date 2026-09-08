const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');

require('ts-node').register({ compilerOptions: { module: 'CommonJS', moduleResolution: 'node' } });
const { MEDIA_CONTACTS, BULK_MEDIA_SENDING_ENABLED, mediaEmailStatus, mediaContactsCsv, buildMediaOutreachEmail } = require('../src/lib/media-outreach.ts');
const asOf = new Date('2026-09-08T12:00:00Z');
const listed = MEDIA_CONTACTS.find(contact => contact.emailEvidence);

test('media research preserves contacts and adds 18 unique sourced routes', () => {
  assert.equal(MEDIA_CONTACTS.length, 44);
  assert.equal(new Set(MEDIA_CONTACTS.map(contact => contact.id)).size, 44);
  const emails = MEDIA_CONTACTS.flatMap(contact => contact.email ? [contact.email.toLowerCase()] : []);
  assert.equal(emails.length, 24);
  assert.equal(new Set(emails).size, 24);
  assert.equal(MEDIA_CONTACTS.filter(contact => mediaEmailStatus(contact, asOf) === 'Publicly listed').length, 24);
  assert.ok(MEDIA_CONTACTS.some(contact => contact.id === 'david-speers'));
  assert.ok(MEDIA_CONTACTS.some(contact => contact.email === 'news@pilbaramedia.com.au'));
});

test('a populated email alone does not establish public-source verification', () => {
  assert.equal(mediaEmailStatus({ ...listed, emailEvidence: undefined }, asOf), 'Needs source verification');
  assert.equal(mediaEmailStatus({ ...listed, email: undefined }, asOf), 'No email researched');
  assert.equal(mediaEmailStatus({ ...listed, email: 'other@example.invalid' }, asOf), 'Needs source verification');
});

test('source evidence must have a valid non-future date and HTTPS source', () => {
  for (const checkedAt of ['not-a-date', '2026-02-30', '2026-09-09', '2026-09-08extra']) {
    assert.equal(mediaEmailStatus({ ...listed, emailEvidence: { ...listed.emailEvidence, checkedAt } }, asOf), 'Needs source verification');
  }
  for (const sourceUrl of ['invalid', 'http://example.org', 'javascript:alert(1)']) {
    assert.equal(mediaEmailStatus({ ...listed, emailEvidence: { ...listed.emailEvidence, sourceUrl } }, asOf), 'Needs source verification');
  }
  assert.equal(mediaEmailStatus(listed, new Date('invalid')), 'Needs source verification');
});

test('public-source evidence ages into an explicit review state', () => {
  assert.equal(mediaEmailStatus(listed, new Date('2026-12-08T00:00:00Z')), 'Source review overdue');
  assert.equal(mediaEmailStatus(listed, new Date('2026-12-07T00:00:00Z')), 'Publicly listed');
});

test('all drafts use the individual angle and clearly qualify participation', () => {
  for (const contact of MEDIA_CONTACTS) {
    const draft = buildMediaOutreachEmail(contact);
    assert.ok(draft.plain.includes(contact.pitchAngle), contact.id);
    assert.match(draft.plain, /self-selected, not representative polling/);
    assert.doesNotMatch(draft.plain, /before.*public launch|verified electorate|scientific population poll/);
    assert.ok(draft.subject.includes(contact.outlet));
  }
  assert.notEqual(buildMediaOutreachEmail(MEDIA_CONTACTS[0]).plain, buildMediaOutreachEmail(MEDIA_CONTACTS[1]).plain);
});

test('desk greetings are not mistaken for personal journalist greetings', () => {
  assert.match(buildMediaOutreachEmail(MEDIA_CONTACTS.find(contact => contact.id === 'phillip-coorey')).plain, /^Hi Phillip,/);
  assert.match(buildMediaOutreachEmail(MEDIA_CONTACTS.find(contact => contact.id === 'guardian-australia-editorial')).plain, /^Hello Guardian Australia team,/);
});

test('HTML drafts escape contact-controlled content', () => {
  const draft = buildMediaOutreachEmail({ ...listed, name: '<img>', outlet: '<script>\r\nInjected', pitchAngle: '<img src=x onerror=alert(1)> & "quote"' });
  assert.doesNotMatch(draft.html, /<img|<script>/);
  assert.match(draft.html, /&lt;img/);
  assert.match(draft.html, /&amp;/);
  assert.doesNotMatch(draft.subject, /[\r\n]/);
});

test('CSV exports source evidence and escapes spreadsheet formulas and quotes', () => {
  const csv = mediaContactsCsv([{ ...listed, name: '=1+1', outlet: 'A "quoted", outlet' }], asOf);
  assert.match(csv, /"'=1\+1"/);
  assert.ok(csv.includes('"A ""quoted"", outlet"'));
  assert.ok(csv.includes(listed.emailEvidence.sourceUrl));
  assert.match(csv, /Individual review and manual confirmation required/);
});

function runPreview(args) {
  const script = "require('ts-node').register({compilerOptions:{module:'CommonJS',moduleResolution:'node'}}); process.argv=['node','scripts/send-media-outreach.ts',...JSON.parse(process.env.MEDIA_TEST_ARGS)]; require('./scripts/send-media-outreach.ts');";
  return spawnSync(process.execPath, ['-e', script], {
    cwd: require('node:path').resolve(__dirname, '..'),
    env: { PATH: process.env.PATH, MEDIA_TEST_ARGS: JSON.stringify(args) },
    encoding: 'utf8', timeout: 30000,
  });
}

test('legacy media CLI is preview-only without credentials or database access', () => {
  assert.equal(BULK_MEDIA_SENDING_ENABLED, false);
  const result = runPreview(['--sample-id=david-speers']);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /PREVIEW ONLY/);
  assert.match(result.stdout, /David Speers/);
});

test('delivery flags cannot re-enable sending or test-email delivery', () => {
  for (const args of [['--send'], ['--send=true'], ['--force'], ['--test-to=example@example.invalid'], ['--send', '--force']]) {
    const result = runPreview(args);
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stderr, /Media sending is disabled/);
  }
});

test('unknown preview contacts fail clearly', () => {
  const result = runPreview(['--sample-id=missing']);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Unknown contact/);
});
