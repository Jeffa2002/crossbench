const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const { randomBytes, createHmac } = require('node:crypto');
const assert = require('node:assert/strict');

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
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', route => {
      const request = route.request();
      if (!request.url().startsWith(`${base}/`)) return route.abort();
      if (!['GET', 'HEAD'].includes(request.method())) {
        attemptedWrites.push(new URL(request.url()).pathname);
        return route.fulfill({ status: 204, body: '' });
      }
      if (request.url().includes('/api/auth/session')) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
      return route.continue();
    });
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${base}/admin/media`, { waitUntil: 'networkidle' });
      assert.equal(await page.getByRole('heading', { name: 'Media research & drafts' }).count(), 1);
      assert.equal(await page.locator('article').count(), 44);
      assert.equal(await page.getByRole('button', { name: 'Sending disabled', exact: true }).isDisabled(), true);
      const downloadPromise = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Download all contacts CSV' }).click();
      const download = await downloadPromise;
      assert.match(download.suggestedFilename(), /^crossbench-media-contacts-.*\.csv$/);
      const stream = await download.createReadStream();
      const parts = [];
      for await (const part of stream) parts.push(part);
      const csv = Buffer.concat(parts).toString('utf8');
      assert.match(csv, /sarah.basford-canales@theguardian.com/);
      assert.match(csv, /Sending disabled; not approved/);
      await page.getByLabel('Email source status').selectOption('published');
      assert.equal(await page.locator('article').count(), 24);
      await page.getByLabel('Find a contact, outlet or beat').fill('Pilbara');
      assert.equal(await page.locator('article').count(), 1);
      await page.getByRole('button', { name: 'Preview draft for Editorial desk', exact: true }).click();
      assert.match(await page.getByLabel('Draft text', { exact: false }).inputValue(), /Pilbara communities/);
      assert.match(await page.getByLabel('Draft text', { exact: false }).inputValue(), /self-selected, not representative polling/);
      await page.getByRole('button', { name: 'Copy draft', exact: true }).click();
      await page.getByText('Draft copied. Nothing has been sent.', { exact: true }).waitFor();
      assert.match(await page.evaluate(() => navigator.clipboard.readText()), /Pilbara communities/);
      await page.getByLabel('Find a contact, outlet or beat').fill('no-such-outlet-999');
      assert.equal(await page.getByText('No contacts match.', { exact: false }).count(), 1);
      const dimensions = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, viewport: window.innerWidth }));
      assert.ok(dimensions.scroll <= dimensions.viewport, `No horizontal page overflow at ${width}px`);
      const controls = await page.locator('input,select,button:not([disabled])').evaluateAll(elements => elements.filter(element => element.getBoundingClientRect().height > 0 && element.closest('[aria-label="Contact filters"], [aria-label="Draft preview"]')).map(element => element.getBoundingClientRect().height));
      assert.ok(controls.every(height => height >= 44), 'Directory controls meet 44px target');
      console.log(`PASS ${width}px: authenticated directory, 44/24 counts, search, tailored preview, no-send, empty state, layout and touch targets`);
    }
    await context.clearCookies();
    const denied = await page.request.get(`${base}/admin/media`, { maxRedirects: 0 });
    assert.equal(denied.status(), 307);
    assert.equal(errors.length, 0, errors.join('\n'));
    assert.ok(attemptedWrites.every(path => !/media|outreach|send/.test(path)), 'No media-related write requests');
    console.log('PASS anonymous redirect, no page errors, no media write attempts; external requests blocked');
  } finally {
    await browser?.close();
    server.kill('SIGTERM');
    await new Promise(resolve => server.exitCode !== null ? resolve() : server.once('exit', resolve));
  }
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
