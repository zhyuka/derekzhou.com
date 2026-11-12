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

test('T1 DOM: the title and the share card are visible; other head meta is not the DOM hash\'s', async () => {
  const { headShown } = await import(new URL('../../.github/ci/harness.mjs', import.meta.url));
  const META = [['viewport', 'width=device-width'], ['description', 'The line.'], ['theme-color', '#000'], ['og:type', 'website'], ['og:title', 'Derek Zhou — Technology Leader'],
    ['og:description', 'The line.'], ['og:url', 'https://derekzhou.com/'], ['twitter:card', 'summary'], ['twitter:title', 'Derek Zhou — Technology Leader'], ['twitter:description', 'The line.']];
  const TITLE = 'Derek Zhou — Technology Leader', base = headShown(TITLE, META);
  const set = (k, v) => META.map(([a, b]) => [a, a === k ? v : b]);
  assert.notEqual(headShown('Derek Zhou', META), base, 'the title (the tab)');
  for (const k of ['description', 'og:type', 'og:title', 'og:description', 'og:url', 'twitter:card', 'twitter:title', 'twitter:description'])
    assert.notEqual(headShown(TITLE, set(k, 'changed')), base, k);
  assert.notEqual(headShown(TITLE, META.concat([['og:image', 'https://derekzhou.com/card.png']])), base, 'a new share image');
  assert.notEqual(headShown(TITLE, META.filter(([k]) => k !== 'twitter:card')), base, 'a card field removed');
  // not the card's: the viewport and theme colour (the frames and the theme field have those), a new robots line
  assert.equal(headShown(TITLE, set('viewport', 'width=device-width, initial-scale=1')), base, 'viewport');
  assert.equal(headShown(TITLE, set('theme-color', '#111')), base, 'theme-color (hashed on its own)');
  assert.equal(headShown(TITLE, META.concat([['robots', 'noindex']])), base, 'robots');
});
