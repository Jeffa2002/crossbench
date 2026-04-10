import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });
  const ctx = await browser.newContext({ userAgent: 'Mozilla/5.0 Chrome/120.0.0.0' });
  const page = await ctx.newPage();

  // Capture ALL requests
  const allCalls: Array<{ method: string; url: string }> = [];
  const jsonResponses: Array<{ url: string; body: string }> = [];
  
  page.on('request', req => {
    allCalls.push({ method: req.method(), url: req.url() });
  });

  page.on('response', async res => {
    const ct = res.headers()['content-type'] || '';
    if (ct.includes('json') || ct.includes('javascript') && res.url().includes('.svc')) {
      try {
        const body = await res.text();
        if (body.includes('Bill') || body.includes('bill') || body.includes('bId')) {
          jsonResponses.push({ url: res.url(), body: body.slice(0, 1000) });
        }
      } catch {}
    }
  });

  // Wait longer for the React app to fully render and make its API calls
  const url = 'https://www.aph.gov.au/Parliamentary_Business/Bills_Legislation/Bills_Search_Results?ParliamentNumber=47&BillStatus=Assented&page=1&perPage=50';
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(12000);

  console.log('\nAll requests (', allCalls.length, '):');
  allCalls
    .filter(c => !c.url.includes('userway') && !c.url.includes('google') && !c.url.includes('.css') && !c.url.includes('.png') && !c.url.includes('.jpg'))
    .forEach(c => console.log(' ', c.method, c.url));

  console.log('\nJSON responses with "Bill":', jsonResponses.length);
  jsonResponses.forEach(r => {
    console.log('\n URL:', r.url);
    console.log(' Body:', r.body.slice(0, 400));
  });

  // Check page content one more time
  const links = await page.$$eval('a[href]', (els: Element[]) => 
    els.map(e => ({ 
      href: (e as HTMLAnchorElement).href, 
      text: e.textContent?.trim().slice(0, 80) 
    }))
    .filter(e => e.href.includes('bId') || (e.text?.includes('Bill') ?? false))
    .slice(0, 10)
  );
  console.log('\nBill links on page:', links.length);
  links.forEach(l => console.log(' ', l.href, '|', l.text));

  await browser.close();
})().catch(console.error);
