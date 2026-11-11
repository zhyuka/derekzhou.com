// test/unit/t1.mjs: T1's DOM hash (.github/ci/harness.mjs): what counts as a visible change in the page's body
import { test, assert } from '../unit-lib.mjs';

test('T1 DOM: a resource hint alone is not a visible change; a stylesheet, the title or the body is', async () => {
  const { dropHints } = await import(new URL('../../.github/ci/harness.mjs', import.meta.url));
  const X = 'xmlns="http://www.w3.org/1999/xhtml"';
  const page = (extra, text = 'Derek Zhou') => `lang=en\n#000\n<body ${X}><h1>${text}</h1>${extra}<div id="world-end" hidden=""></div></body>`;
  const base = page('');
  // #165: one preload of the plan's worker, in the body, as XMLSerializer writes it
  assert.equal(dropHints(page(`<link rel="preload" href="/plan.js" as="script" fetchpriority="low" />`)), base, 'preload');
  for (const rel of ['modulepreload', 'prefetch', 'preconnect', 'dns-prefetch', 'PRELOAD', 'preload prefetch'])
    assert.equal(dropHints(page(`<link rel="${rel}" href="/x.js"></link>`)), base, rel);
  assert.equal(dropHints(page(`<link href="/x.js" rel='preload' as=script>`)), base, 'any quoting, rel not first');
  // the hint's own line, its indent left behind once it (or a comment, a script) is gone
  assert.equal(dropHints(page(`\n  \n  <link rel="preload" href="/plan.js" />\n  `)), dropHints(page('\n  ')), 'the indent it leaves');
  // what can show stays
  assert.notEqual(dropHints(page('<span>a</span> <span>b</span>')), dropHints(page('<span>a</span><span>b</span>')), 'a space between two words');
  for (const t of ['<link rel="stylesheet" href="/style.css" />', '<link rel="preload stylesheet" href="/a.css" />', '<link rel="icon" href="/i.png" />', '<link href="/no-rel.css" />'])
    assert.notEqual(dropHints(page(t)), base, t);
  assert.notEqual(dropHints(page('', 'Derek')), base, 'the words');
  assert.notEqual(dropHints(base.replace('#000', '#111')), base, 'the theme colour');
  assert.notEqual(dropHints(base.replace('lang=en', 'lang=fr')), base, "the root's attributes");
});
