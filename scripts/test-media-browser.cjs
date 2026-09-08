const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const { randomBytes, createHmac } = require('node:crypto');
const assert = require('node:assert/strict');
require('ts-node').register({ compilerOptions: { module: 'CommonJS', moduleResolution: 'node' } });
const { MEDIA_CONTACTS, buildMediaOutreachEmail } = require('../src/lib/media-outreach.ts');

async function main() {
  const base = 'http://127.0.0.1:3166';
  const signingKey = randomBytes(32).toString('hex');
  const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3166'], {
    env: { ...process.env, MISSION_COOKIE_SECRET: signingKey, AUTH_SECRET: randomBytes(32).toString('hex'), AUTH_TRUST_HOST: 'true' },
    stdio: ['ignore', 'ignore', 'ignore'],
  });
  let browser;
  try {
    let ready = false;
    for (let attempt = 0; attempt < 40; attempt++) {
      if (server.exitCode !== null) throw new Error('Isolated preview server exited before readiness');
      try {
        const response = await fetch(`${base}/admin/media`, { redirect: 'manual', signal: AbortSignal.timeout(1500) });
        if (response.status === 307) { ready = true; break; }
      } catch {}
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    assert.equal(ready, true, 'Preview server must start with admin authentication intact');
    browser = await chromium.launch({ headless: true, executablePath: process.env.MEDIA_TEST_CHROMIUM || undefined, args: ['--no-sandbox'] });
    const context = await browser.newContext();
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: base });
    const payload = Buffer.from(JSON.stringify({ purpose: 'admin', exp: Math.floor(Date.now() / 1000) + 600, nonce: randomBytes(16).toString('hex') })).toString('base64url');
    const signature = createHmac('sha256', signingKey).update(payload).digest('hex');
    await context.addCookies([{ name: 'admin_session', value: `${payload}.${signature}`, url: base, httpOnly: true, sameSite: 'Lax' }]);
    const page = await context.newPage();
    const errors = [];
    const attemptedWrites = [];
    const mediaPosts = [];
    const recorded = new Map();
    let mockOutcome = 'SENT';
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', route => {
      const request = route.request();
      if (!request.url().startsWith(`${base}/`)) return route.abort();
      if (new URL(request.url()).pathname === '/api/admin/media/send') {
        if (request.method() === 'POST') {
          const body = request.postDataJSON();
          assert.deepEqual(Object.keys(body).sort(), ['confirmed', 'contactId', 'draftHash']);
          assert.equal(body.confirmed, true);
          assert.equal(typeof body.contactId, 'string');
          mediaPosts.push(body);
          recorded.set(body.contactId, mockOutcome);
          return route.fulfill({ status: mockOutcome === 'SENT' ? 200 : 503, contentType: 'application/json', body: JSON.stringify(mockOutcome === 'SENT' ? { message: 'Accepted by the email provider for this recipient only. Inbox delivery is not yet confirmed.' } : { error: 'Delivery outcome is uncertain. Repeat sending is blocked.' }) });
        }
        const contact = MEDIA_CONTACTS.find(entry => entry.id === new URL(request.url()).searchParams.get('contactId'));
        const draft = buildMediaOutreachEmail(contact);
        const status = recorded.get(contact.id);
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ canSend: Boolean(contact.email) && !status, reason: status ? 'This address already has a recorded attempt. Sending again is blocked.' : contact.email ? null : 'A current, publicly sourced single email address is required.', draftHash: `test-${contact.id}`, from: 'Crossbench <noreply@crossbench.io>', replyTo: 'support+media@crossbench.io', recipient: contact.email || '', subject: draft.subject, text: draft.plain, delivery: status ? { id: 'mock-record', status, sentBy: 'isolated-admin@example.invalid', sentAt: null } : null }) });
      }
      if (!['GET', 'HEAD'].includes(request.method())) {
        attemptedWrites.push(new URL(request.url()).pathname);
        return route.fulfill({ status: 204, body: '' });
      }
      if (request.url().includes('/api/auth/session')) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
      return route.continue();
    });
    for (const width of [390, 1440]) {
      recorded.clear();
      mockOutcome = 'SENT';
      const initialPosts = mediaPosts.length;
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${base}/admin/media`, { waitUntil: 'networkidle' });
      assert.equal(await page.getByRole('heading', { name: 'Media research & drafts' }).count(), 1);
      assert.equal(await page.locator('article').count(), 44);
      assert.equal(await page.getByRole('button', { name: 'Review single email', exact: true }).isDisabled(), true);
      const downloadPromise = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Download all contacts CSV' }).click();
      const download = await downloadPromise;
      assert.match(download.suggestedFilename(), /^crossbench-media-contacts-.*\.csv$/);
      const stream = await download.createReadStream();
      const parts = [];
      for await (const part of stream) parts.push(part);
      const csv = Buffer.concat(parts).toString('utf8');
      assert.match(csv, /sarah.basford-canales@theguardian.com/);
      assert.match(csv, /Individual review and manual confirmation required/);
      await page.getByLabel('Email source status').selectOption('published');
      assert.equal(await page.locator('article').count(), 24);
      await page.getByLabel('Find a contact, outlet or beat').fill('Pilbara');
      assert.equal(await page.locator('article').count(), 1);
      await page.getByRole('button', { name: 'Preview draft for Editorial desk', exact: true }).click();
      assert.match(await page.getByLabel('Draft text', { exact: false }).inputValue(), /I'm Jeff, the person behind Crossbench/);
      assert.match(await page.getByLabel('Draft text', { exact: false }).inputValue(), /vote on bills/);
      assert.match(await page.getByLabel('Draft text', { exact: false }).inputValue(), /extremely early days/);
      assert.match(await page.getByLabel('Draft text', { exact: false }).inputValue(), /haven't reached out to everyone yet or started marketing/);
      assert.match(await page.getByLabel('Draft text', { exact: false }).inputValue(), /self-selected, not representative polling/);
      await page.getByRole('button', { name: 'Copy draft', exact: true }).click();
      await page.getByText('Draft copied. Copying does not send email.', { exact: true }).waitFor();
      assert.match(await page.evaluate(() => navigator.clipboard.readText()), /honest feedback/);
      await page.getByRole('button', { name: 'Review single email', exact: true }).click();
      assert.match(await page.getByLabel('Exact email to send').innerText(), /I'm Jeff, the person behind Crossbench/);
      assert.match(await page.getByLabel('Exact email to send').innerText(), /vote to support or oppose a bill, or abstain/);
      assert.equal(await page.getByRole('button', { name: 'Confirm and send one email', exact: true }).isDisabled(), true);
      await page.getByRole('button', { name: 'Cancel — do not send', exact: true }).click();
      assert.equal(mediaPosts.length, initialPosts, 'Preview and cancel never send');
      await page.getByRole('button', { name: 'Review single email', exact: true }).click();
      await page.getByRole('checkbox').check();
      await page.getByLabel('Preview contact (independent of search)').selectOption('phillip-coorey');
      assert.equal(await page.getByRole('group', { name: 'Confirm one email' }).count(), 0, 'Changing contact discards approval');
      await page.getByRole('button', { name: 'Review single email', exact: true }).click();
      assert.equal(await page.getByRole('checkbox').isChecked(), false);
      assert.equal(await page.getByRole('button', { name: 'Confirm and send one email', exact: true }).isDisabled(), true);
      await page.getByRole('checkbox').check();
      await page.getByRole('button', { name: 'Confirm and send one email', exact: true }).evaluate(element => { element.click(); element.click(); });
      await page.getByText('Accepted by the email provider for this recipient only. Inbox delivery is not yet confirmed.', { exact: true }).waitFor();
      assert.equal(mediaPosts.length, initialPosts + 1, 'Double-click emits exactly one manual send request');
      assert.equal(mediaPosts.at(-1).contactId, 'phillip-coorey');
      assert.equal(await page.getByRole('button', { name: 'Review single email', exact: true }).isDisabled(), true);
      await page.reload({ waitUntil: 'networkidle' });
      await page.getByLabel('Preview contact (independent of search)').selectOption('phillip-coorey');
      await page.getByText('This address already has a recorded attempt. Sending again is blocked.', { exact: true }).waitFor();
      assert.equal(await page.getByRole('button', { name: 'Review single email', exact: true }).isDisabled(), true);
      mockOutcome = 'PENDING';
      const other = MEDIA_CONTACTS.find(entry => entry.email && entry.id !== 'phillip-coorey');
      await page.getByLabel('Preview contact (independent of search)').selectOption(other.id);
      await page.getByRole('button', { name: 'Review single email', exact: true }).click();
      await page.getByRole('checkbox').check();
      await page.getByRole('button', { name: 'Confirm and send one email', exact: true }).click();
      await page.getByText('Delivery outcome is uncertain. Repeat sending is blocked.', { exact: true }).waitFor();
      assert.equal(await page.getByRole('button', { name: 'Review single email', exact: true }).isDisabled(), true);
      assert.equal(mediaPosts.length, initialPosts + 2, 'No automatic retries');
      await page.getByLabel('Find a contact, outlet or beat').fill('no-such-outlet-999');
      assert.equal(await page.getByText('No contacts match.', { exact: false }).count(), 1);
      const dimensions = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, viewport: window.innerWidth }));
      assert.ok(dimensions.scroll <= dimensions.viewport, `No horizontal page overflow at ${width}px`);
      const controls = await page.locator('input,select,button:not([disabled])').evaluateAll(elements => elements.filter(element => element.getBoundingClientRect().height > 0 && element.closest('[aria-label="Contact filters"], [aria-label="Draft preview"]')).map(element => element.getBoundingClientRect().height));
      assert.ok(controls.every(height => height >= 44), 'Directory controls meet 44px target');
      console.log(`PASS ${width}px: directory/CSV/copy, review/cancel, single confirmation, selection reset, double-click guard, persistent sent/uncertain states and no automatic retry`);
    }
    assert.equal((await page.request.post(`${base}/api/admin/media/send`, { headers: { origin: 'https://attacker.invalid' }, data: { confirmed: true } })).status(), 403);
    assert.equal((await page.request.post(`${base}/api/admin/media/send`, { headers: { origin: 'https://www.crossbench.io' }, data: [{ confirmed: true }] })).status(), 400);
    await context.clearCookies();
    const denied = await page.request.get(`${base}/admin/media`, { maxRedirects: 0 });
    assert.equal(denied.status(), 307);
    assert.equal((await page.request.get(`${base}/api/admin/media/send?contactId=phillip-coorey`)).status(), 401);
    assert.equal((await page.request.post(`${base}/api/admin/media/send`, { data: { confirmed: true } })).status(), 401);
    assert.equal(errors.length, 0, errors.join('\n'));
    assert.ok(attemptedWrites.every(path => !/media|outreach|send/.test(path)), 'No media-related write requests');
    console.log('PASS anonymous page/API access denied, no page errors, all send requests intercepted; no real outreach or provider calls');
  } finally {
    await browser?.close();
    server.kill('SIGTERM');
    await new Promise(resolve => server.exitCode !== null ? resolve() : server.once('exit', resolve));
  }
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
