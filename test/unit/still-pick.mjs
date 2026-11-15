// test/unit/still-pick.mjs: hour.js's still, picked over real phones' and desktops' windows (both orientations, the
// browser's bars in and out, a tab not yet sized) and both memory tiers. It fails on any miss: a still the bake does
// not make (tools/gpu/bake-stills.js's shapes and tiers), the wrong tier, or a shape outside A2's rule (portrait under
// h/w 1.893 the shorter still, above it the taller, the tallest past it; landscape and squat windows the narrower,
// the square under it). The run-16 Nord (no still on a real phone) is why: this can't come back on another phone.
// plant: {"file": "site/hour.js", "find": "  if (dk && crs) tier = 'lo';", "with": "", "why": "a touch device in landscape shown the desktop-baked still, and so the desktop's look"}
import { test, assert, fs, path, vm, ROOT, WORLD } from '../unit-lib.mjs';

const HOUR = fs.readFileSync(path.join(ROOT, 'site', 'hour.js'), 'utf8');
const BAKE = fs.readFileSync(path.join(ROOT, 'tools', 'gpu', 'bake-stills.js'), 'utf8');
const SHAPES = JSON.parse(/const ALL = (\[[^\]]+\]);/.exec(BAKE)[1].replace(/'/g, '"'));
const TIERS = ['hi', 'lo'];

function pick(o) {   // hour.js in a fake page: o = { w, h (the window, 0 unsized), sw, sh (the screen), ua, mem, touch }
  const at = {}, props = {}, link = { href: '' };
  const root = { setAttribute: (n, v) => { at[n] = String(v); }, getAttribute: (n) => at[n] ?? null, style: { setProperty: (n, v) => { props[n] = v; } } };
  const mm = (q) => {
    let m = /\(max-aspect-ratio: (\d+)\/(\d+)\)/.exec(q);
    if (m) return { matches: o.w * +m[2] <= o.h * +m[1] };
    return { matches: q === '(pointer: coarse)' ? !!o.touch && !o.fine : false };
  };
  const ctx = {
    Date: class { getHours() { return 18; } getMinutes() { return 30; } }, Uint32Array,   // (18:30 on the visitor's clock: sunset)
    crypto: { getRandomValues: (a) => { a[0] = 5; return a; } },
    document: { documentElement: root, visibilityState: 'visible', querySelector: (s) => (s === 'link.still' ? link : null) },
    navigator: { userAgent: o.ua, deviceMemory: o.mem, maxTouchPoints: o.touch ? (o.fine ? 10 : 5) : 0, hardwareConcurrency: 8 },
    screen: { width: o.sw, height: o.sh }, innerWidth: o.w, innerHeight: o.h
  };
  ctx.window = ctx; ctx.window.matchMedia = mm;
  vm.runInNewContext(HOUR, ctx);
  return { href: link.href, still: props['--still'] || '', look: at['data-look'] ?? null };
}

// the rule, stated on its own: the still a window of these sizes should get
function want(w, h) {
  const r = h / w, P = SHAPES.filter((s) => { const [a, b] = s.split('x').map(Number); return b > a; }).sort((x, y) => ar(x) - ar(y));
  const L = SHAPES.filter((s) => { const [a, b] = s.split('x').map(Number); return b <= a; }).sort((x, y) => wr(x) - wr(y));
  if (r >= 1.893) return P.find((s) => ar(s) >= r - 0.002) || P[P.length - 1];   // (taller, the tallest past it)
  if (r >= 1.333) return [...P].reverse().find((s) => ar(s) <= r + 0.002);       // (shorter)
  const x = w / h; return [...L].reverse().find((s) => wr(s) <= x + 0.002) || L[0];   // (narrower, the square under it)
}
function ar(s) { const [a, b] = s.split('x').map(Number); return b / a; }
function wr(s) { const [a, b] = s.split('x').map(Number); return a / b; }

const AND = 'Mozilla/5.0 (Linux; Android 14; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/159.0.0.0 Mobile Safari/537.36';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const IPAD = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';
const DESK = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36';
// [name, screen w x h (portrait for phones), the windows (w x h): the bars out and in, both orientations]
const PHONES = [
  ['Nord CE 3 Lite', 412, 915, [[412, 839], [412, 704], [915, 412], [915, 330]]],
  ['Galaxy A15', 384, 853, [[384, 759], [384, 651], [853, 384], [853, 300]]],
  ['Pixel 8', 412, 915, [[412, 839], [412, 732], [915, 412], [915, 340]]],
  ['iPhone 16', 393, 852, [[393, 852], [393, 759], [393, 659], [852, 393], [852, 340]]],
  ['iPhone SE', 375, 667, [[375, 667], [375, 553], [667, 375], [667, 320]]],
  ['iPhone 16 Pro Max', 440, 956, [[440, 956], [440, 832], [956, 440], [956, 380]]],
  ['iPad Air', 820, 1180, [[820, 1180], [820, 1106], [1180, 820], [1180, 746]]]
];
const DESKS = [[1440, 900], [1920, 1080], [2560, 1080], [1280, 1000], [1100, 1000], [3440, 1440], [1000, 1300]];

test('still-pick: every phone and desktop window, both orientations, the bars in and out, both tiers, a still the bake makes by A2\'s rule', () => {
  const misses = []; let n = 0;
  const check = (who, o, tier) => {
    const r = pick(o), m = /\/assets\/still\/(\w+)-(\d+)-(hi|lo)-(\d+x\d+)\.avif$/.exec(r.href), w = o.w || o.sw, h = o.h || o.sh;
    n++;
    if (!m) { misses.push(`${who}: no still asked (${r.href || 'nothing'})`); return; }
    if (r.still !== `url("${r.href}")`) misses.push(`${who}: --still ${r.still} is not the preload's ${r.href}`);
    if (!SHAPES.includes(m[4]) || !TIERS.includes(m[3])) misses.push(`${who}: ${m[3]}-${m[4]} is not a still the bake makes`);
    // (the hub, 2026-11-15: one tier for every look) a touch device is shown the lo still where a hi one would be baked as
    // a desktop (a landscape or square shape): it never draws the desktop's look
    const ws = want(w, h).split('x').map(Number), want3 = o.touch && ws[0] >= ws[1] ? 'lo' : tier;
    if (m[3] !== want3) misses.push(`${who}: tier ${m[3]}, want ${want3}`);
    const lk = m[3] === 'hi' && ws[0] >= ws[1] ? 'desk' : 'touch';
    if (r.look !== lk) misses.push(`${who}: data-look ${r.look}, want ${lk} (the still's own look)`);
    if (m[4] !== want(w, h)) misses.push(`${who} ${w}x${h} (h/w ${(h / w).toFixed(3)}): ${m[4]}, want ${want(w, h)}`);
    if (m[1] !== 'sunset' || m[2] !== '5') misses.push(`${who}: opening ${m[1]}-${m[2]}, want sunset-5 (18:30, read 5)`);
  };
  for (const [name, sw, sh, wins] of PHONES) {
    const ios = /iPhone/.test(name), ipad = /iPad/.test(name);
    for (const [w, h] of wins) {
      const land = w > h, s = land ? [sh, sw] : [sw, sh];
      if (ios || ipad) check(`${name} ${w}x${h}`, { w, h, sw: s[0], sh: s[1], ua: ipad ? IPAD : IOS, mem: undefined, touch: true }, 'hi');
      else for (const [mem, tier] of [[4, 'lo'], [8, 'hi']]) check(`${name} ${w}x${h} ${mem} GB`, { w, h, sw: s[0], sh: s[1], ua: AND, mem, touch: true }, tier);
    }
    // a tab not yet sized when the head runs (opened by an intent): the screen's own shape, both orientations
    for (const [a, b] of [[sw, sh], [sh, sw]]) {
      if (ios || ipad) check(`${name} unsized ${a}x${b}`, { w: 0, h: 0, sw: a, sh: b, ua: ipad ? IPAD : IOS, mem: undefined, touch: true }, 'hi');
      else for (const [mem, tier] of [[4, 'lo'], [8, 'hi']]) check(`${name} unsized ${a}x${b} ${mem} GB`, { w: 0, h: 0, sw: a, sh: b, ua: AND, mem, touch: true }, tier);
    }
  }
  for (const [w, h] of DESKS) check(`desktop ${w}x${h}`, { w, h, sw: w, sh: h, ua: DESK, mem: 8, touch: false }, 'hi');
  assert.ok(n >= 68, `${n} windows`);
  assert.deepEqual(misses, [], `${misses.length} of ${n} windows missed:\n` + misses.join('\n'));
});

test('still-pick: a page with no still preload (a build with no stills) asks for none', () => {
  const at = {}, props = {};
  const ctx = { Date, Uint32Array, crypto: { getRandomValues: (a) => a }, screen: { width: 393, height: 852 }, innerWidth: 393, innerHeight: 852,
    document: { documentElement: { setAttribute: (n, v) => { at[n] = v; }, style: { setProperty: (n, v) => { props[n] = v; } } }, querySelector: () => null },
    navigator: { userAgent: IOS, maxTouchPoints: 5 } };
  ctx.window = ctx; ctx.window.matchMedia = () => ({ matches: false });
  vm.runInNewContext(HOUR, ctx);
  assert.equal(props['--still'], undefined);
  assert.ok(at['data-seed'] !== undefined, 'the read is still made');
});

// (CI lane, 2026-11-15: the owner's "0 disconnects") the still a window gets was baked on the bake's own device for
// its tier and shape (bake-stills.js win()): an iPhone's or a portrait desktop's still on the bake's phone, a
// landscape one on its desktop. Where the world branches on the device's memory tier (memTier() === '<tier>': the
// clouds' look), the bake's device must take the same branch as the visitor's, or the cut from the still to the live
// world shows (a touch device in landscape got a still with the desktop's clouds). Table lookups by the tier (the
// density, the boot's rung) are not a look's branch and are not compared.
const MEMTIER = (() => { const m = /\n  function memTier\(\) \{[\s\S]*?\n  \}\n/.exec(WORLD); assert.ok(m, 'memTier() found in world.js'); return m[0]; })();
const WIN = (() => { const m = /function win\(shape, tier\) \{[\s\S]*?\n\}/.exec(BAKE); assert.ok(m, 'win() found in bake-stills.js'); return vm.runInNewContext('(' + m[0] + ')'); })();
function memTierOf(d) {   // the world's memTier() on a device: { ua, touch, mem, dpr, sw, sh, renderer }
  const nav = { userAgent: d.ua, maxTouchPoints: d.touch ? 5 : 0, deviceMemory: d.mem };
  const ctx = { SW: {}, EXT: { renderer: d.renderer }, navigator: nav, screen: { width: d.sw, height: d.sh },
    window: { devicePixelRatio: d.dpr, matchMedia: (q) => ({ matches: q === '(pointer: coarse)' ? !!d.touch : false }) } };
  return vm.runInNewContext(MEMTIER + 'memTier();', ctx);
}
function bakeDevice(tier, shape) {   // the bake's page for a still: Playwright's Chrome on Windows, mobile = isMobile + hasTouch
  const [w, h, dpr, mobile, mem, gpu] = WIN(shape, tier);
  return { ua: DESK, touch: mobile, mem, dpr, sw: w, sh: h, renderer: gpu || 'Harness GPU' };
}
const DPR = { 'Nord CE 3 Lite': 2.625, 'Galaxy A15': 2.8125, 'Pixel 8': 2.625, 'iPhone 16': 3, 'iPhone SE': 2, 'iPhone 16 Pro Max': 3, 'iPad Air': 2 };
function windows() {   // every window of the test above, with its device: [who, the page's input to pick(), the device]
  const out = [];
  for (const [name, sw, sh, wins] of PHONES) {
    const apple = /iPhone|iPad/.test(name), ua = /iPad/.test(name) ? IPAD : apple ? IOS : AND;
    const all = wins.map(([w, h]) => [w, h, w > h ? [sh, sw] : [sw, sh]]).concat([[0, 0, [sw, sh]], [0, 0, [sh, sw]]]);
    for (const [w, h, s] of all) for (const mem of apple ? [undefined] : [4, 8]) {
      const o = { w, h, sw: s[0], sh: s[1], ua, mem, touch: true };
      out.push([`${name} ${w ? w + 'x' + h : 'unsized ' + s.join('x')}${mem ? ' ' + mem + ' GB' : ''}`, o, { ua, touch: true, mem, dpr: DPR[name], sw: s[0], sh: s[1], renderer: apple ? 'Apple GPU' : 'Mali-G57 MC2' }]);
    }
  }
  for (const [w, h] of DESKS) out.push([`desktop ${w}x${h}`, { w, h, sw: w, sh: h, ua: DESK, mem: 8, touch: false }, { ua: DESK, touch: false, mem: 8, dpr: 1, sw: w, sh: h, renderer: 'NVIDIA GeForce RTX 4090' }]);
  return out;
}
function lookSplits(branches) {   // the windows whose still's bake device takes another look branch than the visitor's own
  const bad = [];
  for (const [who, o, dev] of windows()) {
    const m = /-(hi|lo)-(\d+x\d+)\.avif$/.exec(pick(o).href), seen = memTierOf(dev), baked = memTierOf(bakeDevice(m[1], m[2]));
    const diff = branches.filter((t) => (seen === t) !== (baked === t));
    if (diff.length) bad.push(`${who}: the visitor's memTier ${seen}, the still (${m[1]}-${m[2]}) baked as ${baked}: memTier() === '${diff.join("', '")}' differs`);
  }
  return bad;
}
const BRANCHES = [...new Set([...WORLD.matchAll(/memTier\(\)\s*[!=]==?\s*'(\w+)'/g)].map((m) => m[1]))];

test('still-pick: the bake\'s device takes the same look branches by memTier as every window\'s own device (the still-to-live cut)', () => {
  assert.ok(windows().length >= 68, windows().length + ' windows');
  const bad = lookSplits(BRANCHES);
  assert.deepEqual(bad, [], `the world branches on memTier() === ${BRANCHES.map((t) => "'" + t + "'").join(', ') || '(none)'}, and ${bad.length} window(s) get a still baked on the other side:\n` + bad.join('\n') +
    '\nKey the look off what the still was baked as (hour.js\'s tier and shape), or bake those stills on a device of the visitor\'s tier (bake-stills.js win()).');
});

test('still-pick: the look\'s tier is the still\'s on every window (hour.js\'s data-look), and no touch device draws the desktop\'s look', () => {
  const bad = [];
  for (const [who, o] of windows()) {
    const r = pick(o), m = /-(hi|lo)-(\d+x\d+)\.avif$/.exec(r.href), baked = bakeDevice(m[1], m[2]), bakedDesk = !baked.touch;
    if ((r.look === 'desk') !== bakedDesk) bad.push(`${who}: data-look ${r.look}, the still (${m[1]}-${m[2]}) baked as ${bakedDesk ? 'a desktop' : 'a touch device'}`);
    if (o.touch && r.look === 'desk') bad.push(`${who}: a touch device given the desktop's look`);
  }
  assert.deepEqual(bad, [], bad.join('\n'));
  // (and the world keys its looks on it: data-look read once, never memTier)
  assert.match(WORLD, /var LOOKD = attr\('data-look'\) === 'desk';/, 'the world does not read the look\'s tier from the page');
  assert.deepEqual(BRANCHES, [], `the world branches a look on memTier() === ${BRANCHES.join(', ')}: key it on LOOKD (data-look)`);
});

test('still-pick: a touchscreen laptop (touch points, a fine pointer) keeps the desktop\'s still and look', () => {
  const WIN = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36';
  for (const [w, h] of [[1920, 1080], [1536, 864], [1366, 768]]) {
    const r = pick({ w, h, sw: w, sh: h, ua: WIN, mem: 8, touch: true, fine: true });
    assert.match(r.href, /-hi-/, `${w}x${h}: a touchscreen laptop given the lo still (${r.href})`);
    assert.equal(r.look, 'desk', `${w}x${h}: a touchscreen laptop given the phone's look`);
    const t = pick({ w, h, sw: w, sh: h, ua: WIN, mem: 8, touch: true });
    assert.equal(t.look, 'touch', `${w}x${h}: a coarse pointer in landscape given the desktop's look`);
  }
});
