// harness.mjs: the gates' browser. Pinned Chromium on SwiftShader (software WebGL2, the same bits on every runner for a
// given build), the page's clock paused and stepped by Playwright (page.clock), and only what any visitor's browser
// offers: no hook of the page is used. Harness-side stubs, the same on every arm:
//   - the visit's entropy: each crypto.getRandomValues call filled from a fixed list (the page's one entropy read);
//   - the GPU's name (the world rightly keeps the still sky on a CPU renderer), fences reported signalled and parallel
//     compiles reported complete (so this machine's timing cannot change what is drawn when);
//   - preserveDrawingBuffer, so the canvas can be read back after any frame;
//   - every shaderSource call's text kept (the census), every CSP violation kept.
// Never part of the site.
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
const require = createRequire(import.meta.url);

export function loadPlaywright() {
  const tries = [process.env.PW_CORE, 'playwright-core', 'playwright'].filter(Boolean);
  for (const t of tries) { try { return require(t); } catch {} }
  throw new Error('no playwright-core (set PW_CORE or npm install it)');
}

export const SWIFTSHADER = ['--use-gl=angle', '--use-angle=swiftshader-webgl', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist',
  '--disable-gpu-driver-bug-workarounds', '--force-color-profile=srgb', '--disable-background-timer-throttling',
  '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'];

// The devices the gates play (renderer names as glsl_guard.js's devices): `generic` is most visitors' path; `nvidia`
// takes the split height (HPSPLIT) by its name.
export const PERSONAS = {
  generic: { renderer: 'ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)' },
  nvidia: { renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 4090 Direct3D11 vs_5_0 ps_5_0, D3D11)' },
};

export async function launch() {
  const pw = loadPlaywright();
  const opts = { args: SWIFTSHADER, headless: true };
  if (process.env.CHROME_PATH) opts.executablePath = process.env.CHROME_PATH;
  return pw.chromium.launch(opts);
}

const INIT = (o) => `(() => {
  const SEEDS = ${JSON.stringify(o.seeds)}, RENDERER = ${JSON.stringify(o.renderer)}, CENSUS = ${o.census ? 'true' : 'false'}, NOWEBGL = ${o.nowebgl ? 'true' : 'false'};
  const CI = window.__ci = { calls: 0, src: [], csp: [], errors: [], gl: null };
  crypto.getRandomValues = function (a) { const s = SEEDS[CI.calls % SEEDS.length] >>> 0; CI.calls++;
    const u = new Uint32Array(a.buffer, a.byteOffset, a.byteLength >> 2); for (let i = 0; i < u.length; i++) u[i] = (s + i * 0x9e3779b9) >>> 0;
    const b = new Uint8Array(a.buffer, a.byteOffset, a.byteLength); for (let i = u.length * 4; i < b.length; i++) b[i] = (s >>> (8 * (i & 3))) & 255; return a; };
  const G = WebGL2RenderingContext.prototype, gp = G.getParameter, gpp = G.getProgramParameter, gsp = G.getShaderParameter, gsy = G.getSyncParameter, ss = G.shaderSource;
  G.getParameter = function (p) { if (p === 0x9246) return RENDERER; if (p === 0x9245) return 'Google Inc.'; return gp.call(this, p); };
  G.clientWaitSync = function () { return 0x911A; };
  G.getSyncParameter = function (s, p) { return p === 0x9114 ? 0x9119 : gsy.call(this, s, p); };
  G.getProgramParameter = function (pr, p) { return p === 0x91B1 ? true : gpp.call(this, pr, p); };
  G.getShaderParameter = function (sh, p) { return p === 0x91B1 ? true : gsp.call(this, sh, p); };
  // SwiftShader has no KHR_parallel_shader_compile: offered here (its compiles then report complete, and the link
  // waits as it must), so the boot takes the path of Chrome, Edge and Firefox on a GPU, and the split height's devices
  // (an NVIDIA name under Direct3D 11, float targets, parallel compiles) take theirs.
  const PAR = { COMPLETION_STATUS_KHR: 0x91B1, maxShaderCompilerThreadsKHR() {} }, ge = G.getExtension, gse = G.getSupportedExtensions;
  G.getExtension = function (n) { return n === 'KHR_parallel_shader_compile' ? PAR : ge.call(this, n); };
  G.getSupportedExtensions = function () { const l = gse.call(this); return l && l.concat(['KHR_parallel_shader_compile']); };
  G.shaderSource = function (sh, s) { if (CENSUS) CI.src.push(String(s)); return ss.call(this, sh, s); };
  const gc = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (t, op) {
    if (NOWEBGL && /webgl/.test(t)) return null;   // a browser without WebGL2: the still sky
    if (t === 'webgl2') op = Object.assign({}, op || {}, { preserveDrawingBuffer: true });
    const c = gc.call(this, t, op); if (t === 'webgl2' && c && this.classList.contains('sky')) CI.gl = c; return c; };
  document.addEventListener('securitypolicyviolation', (e) => CI.csp.push(e.violatedDirective + ' ' + e.blockedURI));
  window.addEventListener('error', (e) => CI.errors.push(String(e.message)));
})();`;

// One page of one arm. vp = [w, h, dpr]; mobile adds touch and a phone's UA-free mobile viewport.
export async function openPage(browser, url, { vp, persona = 'generic', epoch, seeds, census = false, nowebgl = false, mobile = false, reducedMotion = 'no-preference' }) {
  const [width, height, deviceScaleFactor] = vp;
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor, isMobile: mobile, hasTouch: mobile, timezoneId: 'UTC', locale: 'en-US', reducedMotion });
  const page = await ctx.newPage();
  const logs = [];
  page.on('console', (m) => { if (m.type() === 'error' || /Content Security Policy|Refused to/.test(m.text())) logs.push(m.type() + ': ' + m.text().slice(0, 300)); });
  page.on('pageerror', (e) => logs.push('pageerror: ' + e.message));
  await page.clock.install({ time: epoch - 1000 });   // (pauseAt only moves forward)
  await page.clock.pauseAt(epoch);
  await page.addInitScript(INIT({ seeds, renderer: PERSONAS[persona].renderer, census, nowebgl }));
  // The fonts are font-display: optional, so a load on a busy machine may miss their block period and keep the
  // fallback for good (seen on a runner: the 404 page in Geist on one arm, in the fallback on the other). Every arm's
  // stylesheet is answered with font-display: block instead, so every load waits for the fonts, as a returning
  // visitor's (cached) load gets them. The same rewrite on every arm; nothing else of a response is touched.
  await ctx.route(/\.css(\?.*)?$/, async (route) => {
    const r = await route.fetch();
    route.fulfill({ response: r, body: (await r.text()).replace(/font-display:\s*optional/g, 'font-display: block') });
  });
  await page.goto(url, { waitUntil: 'load', timeout: 120000 });
  await page.evaluate(() => document.fonts.ready.then(() => true));
  return { ctx, page, logs, frames: 0 };
}

// Playwright's fake requestAnimationFrame ticks every 16 ms of the paused clock: a step of exactly 16 ms runs exactly
// one frame (a step of 1000/60 would now and then run two, and two arms that showed on different frames would drift).
export const DT = 16;

export async function step(arm, n) { for (let i = 0; i < n; i++) { await arm.page.clock.runFor(DT); arm.frames++; } }

export async function shown(arm) { return arm.page.evaluate(() => { const c = document.querySelector('canvas.sky'); return !!c && c.classList.contains('on'); }); }

// Step to the arm's own first shown frame (a faster boot shows sooner: frames after the show are compared, not page time).
export async function stepToShow(arm, maxFrames = 3000) {
  while (arm.frames < maxFrames) {
    await step(arm, 1);
    if (await shown(arm)) { arm.shownAt = arm.frames; return arm.frames; }
  }
  arm.shownAt = -1; return -1;
}

// The frame and the DOM, hashed in the page: the canvas read back with readPixels (the world's GL state saved and
// restored around it), SHA-256; the title and share-card meta (headShown), the root's attributes, the theme colour
// and the body serialised (resource hints dropped: dropHints), SHA-256.
export async function capture(arm, { pixels = false } = {}) {
  const r = await arm.page.evaluate(async (pixels) => {
    const hex = (b) => Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, '0')).join('');
    const c = document.querySelector('canvas.sky'), gl = window.__ci.gl;
    const r = { shown: !!c && c.classList.contains('on'), w: 0, h: 0, frame: null, csp: window.__ci.csp.slice(), errors: window.__ci.errors.slice() };
    if (gl && c.width && c.height) {
      const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight, d = new Uint8Array(w * h * 4);
      const rf = gl.getParameter(gl.READ_FRAMEBUFFER_BINDING), pb = gl.getParameter(gl.PIXEL_PACK_BUFFER_BINDING), pa = gl.getParameter(gl.PACK_ALIGNMENT);
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null); gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null); gl.pixelStorei(gl.PACK_ALIGNMENT, 4);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, d);
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, rf); gl.bindBuffer(gl.PIXEL_PACK_BUFFER, pb); gl.pixelStorei(gl.PACK_ALIGNMENT, pa);
      r.w = w; r.h = h; r.frame = hex(await crypto.subtle.digest('SHA-256', d));
      let s = 0; for (let i = 0; i < d.length; i += 4) s += d[i] + d[i + 1] + d[i + 2]; r.mean = +(s / (d.length / 4 * 3)).toFixed(3);
      if (pixels) { let bin = ''; for (let i = 0; i < d.length; i += 0x8000) bin += String.fromCharCode.apply(null, d.subarray(i, i + 0x8000)); r.rgba = btoa(bin); r.png = c.toDataURL('image/png'); }
    }
    const root = document.documentElement;
    r.root = Array.from(root.attributes).map((a) => a.name + '=' + a.value).join(' | ');
    r.theme = (document.querySelector('meta[name="theme-color"]') || {}).content || null;
    // What the tab and a share card show: the title and every description, og: and twitter: meta (headShown).
    r.title = document.title;
    r.meta = Array.from(document.head.querySelectorAll('meta')).map((m) => [m.getAttribute('property') || m.getAttribute('name') || '', m.getAttribute('content') || '']);
    // What renders: the body without its <script> elements and comments, a served file's version number dropped (a rename that
    // changes no byte a visitor sees is not a visible change; the bytes themselves are the frames' business).
    const body = document.body.cloneNode(true); body.querySelectorAll('script').forEach((e) => e.remove());
    const tw = document.createTreeWalker(body, NodeFilter.SHOW_COMMENT), cm = []; while (tw.nextNode()) cm.push(tw.currentNode); cm.forEach((n) => n.remove());
    const ser = new XMLSerializer().serializeToString(body).replace(/\.(v|sub)\d+\.(js|css|woff2)/g, '.$1.$2');
    r.domText = r.root + '\n' + r.theme + '\n' + ser;
    return r;
  }, pixels);
  r.dom = createHash('sha256').update(headShown(r.title, r.meta) + '\n' + dropHints(r.domText)).digest('hex'); delete r.domText; delete r.meta;
  return r;
}

// The head's part of what a visitor sees: the title (the tab) and the meta a search result or a share card reads
// (description, og:*, twitter:*), in the page's order. Other meta (viewport, theme-color, which root and theme cover,
// robots and the like) is left to the frames and the static checks.
export function headShown(title, meta) {
  const card = meta.filter(([k]) => /^(description$|og:|twitter:)/i.test(k)).map(([k, v]) => k.toLowerCase() + '=' + v);
  return 'title=' + title + '\n' + card.join('\n');
}

// Resource hints render nothing: a <link> whose every rel is preload, modulepreload, prefetch, preconnect or
// dns-prefetch only changes when bytes arrive, and the frames show whether that changed anything. Dropped from the
// serialised body before it is hashed, so a hint alone is not a visible change; any other <link> (a stylesheet, an
// icon) and everything else stays. Then each run of white space between two tags is one space: a run renders as one
// space, and a dropped hint, script or comment leaves its line's indent behind.
const HINTS = new Set(['preload', 'modulepreload', 'prefetch', 'preconnect', 'dns-prefetch']);
export function dropHints(text) {
  return text.replace(/<link\b[^>]*>(?:\s*<\/link>)?/gi, (tag) => {
    const m = tag.match(/\srel\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const rels = m ? (m[1] ?? m[2] ?? m[3]).toLowerCase().split(/\s+/).filter(Boolean) : [];
    return rels.length && rels.every((x) => HINTS.has(x)) ? '' : tag;
  }).replace(/>\s+</g, '> <');
}

// A diff image (red where any channel differs, the base dimmed elsewhere), encoded by the page as a PNG.
export async function diffPng(page, a, b, w, h) {
  const A = Buffer.from(a, 'base64'), B = Buffer.from(b, 'base64');
  const out = Buffer.alloc(w * h * 4); let n = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = ((h - 1 - y) * w + x) * 4, o = (y * w + x) * 4;   // readPixels' rows are bottom-up
    const diff = A[i] !== B[i] || A[i + 1] !== B[i + 1] || A[i + 2] !== B[i + 2] || A[i + 3] !== B[i + 3];
    if (diff) { n++; out[o] = 255; out[o + 1] = 0; out[o + 2] = 0; } else { const g = (A[i] + A[i + 1] + A[i + 2]) / 9; out[o] = out[o + 1] = out[o + 2] = g; }
    out[o + 3] = 255;
  }
  const png = await page.evaluate(([d, w, h]) => {
    const bin = atob(d), u = new Uint8ClampedArray(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').putImageData(new ImageData(u, w, h), 0, 0); return c.toDataURL('image/png');
  }, [out.toString('base64'), w, h]);
  return { png, changed: n };
}
