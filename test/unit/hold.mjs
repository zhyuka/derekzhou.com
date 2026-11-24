// test/unit/hold.mjs: the first-paint hold's gates, by browser. hour.js takes the hold's link out before the body
// for every browser but those whose world comes in time; of WebKit only Safari on a Mac keeps it (#320: the Apple
// bench's film, the words and the world together at 0.4-0.6 s). Then the world's holdMs (520) gives the deadline:
// Safari on a Mac HOLD_WK (1 s, a never-seen build's first visit at worst the words 1 s late), iOS and iPadOS none,
// an 8-core Chromium 2 s. It fails when a gate lets the wrong browser hold, or a browser that should hold loses it.
// plant: {"file": "site/hour.js", "find": " && !(/Macintosh/.test(ua) && (nav.maxTouchPoints || 0) <= 1)", "with": "", "why": "Safari on a Mac loses its hold: the words over the flat still sky again, the world cut in at 1.9 s"}
// plant: {"file": "src/world/520-start.js", "find": "if (EXT.wkMac) return HOLD_WK;", "with": "", "why": "Safari on a Mac held 2 s, not 1: a never-seen build's first visit blank for 2 s"}
import { test, assert, fs, path, vm, ROOT, WORLD, cut } from '../unit-lib.mjs';

const HOUR = fs.readFileSync(path.join(ROOT, 'site', 'hour.js'), 'utf8');

const UA = {
  macSafari: ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15', 0],
  ipadAsMac: ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15', 5],
  iphone: ['Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1', 5],
  macFirefox: ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:140.0) Gecko/20100101 Firefox/140.0', 0],
  macChrome: ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 0],
  winEdge: ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0', 0]
};

function hourKeeps([ua, touch]) {   // hour.js in a fake page, an 8-core desktop with nothing else taking the hold out
  const hold = { removed: false, remove() { this.removed = true; } }, root = { setAttribute() {}, style: { setProperty() {} } };
  const ctx = {
    Date: class { getHours() { return 12; } getMinutes() { return 0; } }, Uint32Array,
    crypto: { getRandomValues: (a) => { a[0] = 1; return a; } }, WebGL2RenderingContext: function () {},
    document: { documentElement: root, visibilityState: 'visible', querySelector: (s) => (s === 'link[rel="expect"][blocking="render"]' ? hold : null) },
    navigator: { userAgent: ua, maxTouchPoints: touch, hardwareConcurrency: 8 },
    screen: { width: 1440, height: 900 }, innerWidth: 1440, innerHeight: 900
  };
  ctx.window = ctx; ctx.window.matchMedia = () => ({ matches: false });
  vm.runInNewContext(HOUR, ctx);
  return !hold.removed;
}

// the world's own gates: 050's WebKit test (EXT.parAll, EXT.wkMac) and 520's holdMs, cut from the assembled world
const WK = cut(WORLD, 'var wkUA = navigator.userAgent', 'EXT.issueAll');
const HOLDMS = cut(WORLD, 'var HOLD_WK = 1000;', 'function holdRun()');
function holdMs([ua, touch], renderer) {
  const ctx = { navigator: { userAgent: ua, maxTouchPoints: touch, hardwareConcurrency: 8 }, EXT: { par: {}, renderer }, HOLD: {} };
  vm.runInNewContext(WK + HOLDMS + '; this.ms = holdMs();', ctx);
  return ctx.ms;
}

test('hold: hour.js keeps the link for Safari on a Mac and Chromium desktops, takes it out for iPad, iPhone and Firefox', () => {
  const want = { macSafari: true, ipadAsMac: false, iphone: false, macFirefox: false, macChrome: true, winEdge: true };
  for (const k of Object.keys(want)) assert.equal(hourKeeps(UA[k]), want[k], `${k}: hold ${want[k] ? 'kept' : 'taken out'}`);
});

test('hold: holdMs gives Safari on a Mac 1 s, iPad and iPhone none, an 8-core Mac Chrome 2 s', () => {
  assert.equal(holdMs(UA.macSafari, 'Apple M2'), 1000, 'Safari on a Mac: HOLD_WK');
  assert.equal(holdMs(UA.ipadAsMac, 'Apple GPU'), 0, 'iPad behind a Mac user agent: no hold');
  assert.equal(holdMs(UA.iphone, 'Apple GPU'), 0, 'iPhone: no hold');
  assert.equal(holdMs(UA.macChrome, 'ANGLE (Apple, ANGLE Metal Renderer: Apple M2, Unspecified Version)'), 2000, 'Mac Chrome, 8 cores: 2 s');
});
