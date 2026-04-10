import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });
  const ctx = await browser.newContext({ userAgent: 'Mozilla/5.0 Chrome/120.0.0.0' });
  const page = await ctx.newPage();

  // Capture all XHR/fetch requests
  const apiCalls: string[] = [];
  const responses: Array<{ url: string; body: string }> = [];
  
  page.on('request', req => {
    const url = req.url();
    if (url.includes('api') || url.includes('.svc') || url.includes('Bill') || url.includes('search')) {
      apiCalls.push(`${req.method()} ${url}`);
    }
  });

  page.on('response', async res => {
    const url = res.url();
    if ((url.includes('api') || url.includes('.svc') || url.includes('Bill')) && 
        res.headers()['content-type']?.includes('json')) {
      try {
        const body = await res.text();
        responses.push({ url, body: body.slice(0, 500) });
      } catch {}
    }
  });

  const url = 'https://www.aph.gov.au/Parliamentary_Business/Bills_Legislation/Bills_Search_Results?ParliamentNumber=47&BillStatus=Assented&page=1&perPage=50';
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(8000);

  console.log('\nAPI calls intercepted:', apiCalls.length);
  apiCalls.forEach(u => console.log(' -', u));

  console.log('\nJSON responses:', responses.length);
  responses.forEach(r => console.log(' URL:', r.url, '\n Body:', r.body.slice(0, 200)));

  // Check what's actually on the page
  const bodyText = await page.locator('body').innerText().catch(() => '');
  console.log('\nPage text snippet (looking for bill titles):', 
    bodyText.split('\n').filter(l => l.includes('Bill') || l.includes('Act')).slice(0, 5)
  );

  await browser.close();
})().catch(console.error);
