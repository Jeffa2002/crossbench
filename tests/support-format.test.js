const test = require('node:test');
const assert = require('node:assert/strict');

test('support reply formatting renders safe bold, italic, lists, and links', async () => {
  const { supportMarkdownToHtml } = await import('../src/lib/support-format.ts');
  const html = supportMarkdownToHtml('**Bold** and _italic_\n- First\n- [Crossbench](https://crossbench.io)');

  assert.match(html, /<strong>Bold<\/strong>/);
  assert.match(html, /<em>italic<\/em>/);
  assert.match(html, /<ul/);
  assert.match(html, /href="https:\/\/crossbench\.io"/);
});

test('support reply formatting escapes HTML and does not link unsafe schemes', async () => {
  const { supportMarkdownToHtml } = await import('../src/lib/support-format.ts');
  const html = supportMarkdownToHtml('<script>alert(1)</script> [bad](javascript:alert(1))');

  assert.doesNotMatch(html, /<script>/);
  assert.doesNotMatch(html, /href="javascript:/);
  assert.match(html, /&lt;script&gt;/);
});
