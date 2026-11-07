// glsl_guard.js (CI: validate.yml's step "Every visit compiles the same shaders"). A returning visitor's world is
// quick only when Chrome's shader cache answers for every program, and it answers only for a source it has seen byte
// for byte. So this guard holds two rules:
//  1. No per-visit, per-window or per-hour value in any GLSL source. The site's scripts (every script index.html
//     loads, in the order the page runs them, as shipped, minified or not) run in node in a small fake browser with a
//     fake WebGL2 context. The fake keeps every source handed to shaderSource, until the world has shown and gone
//     quiet (nothing is compiled after the show). That is done for several visits of several devices. A visit differs
//     in its entropy, its hour, its window and density, its clock's start and its frame rate. The devices are a desktop
//     Chrome (the reference), a phone Chrome, a WebKit phone, a GPU with half-float targets only and one with no float
//     targets. Within a device every visit must compile the same programs with the same sources, byte for byte.
//     Across devices the sources may differ only by #define lines just after "#version 300 es" (DEFS, per device).
//  2. A deploy changes only the programs it edits. CI no longer holds this here (2026-11-06: no derived file is
//     committed): the gate's census compares the base's build with the head's, and T2 names and reads back each changed
//     program. --manifest/--write remain for a local look: the reference device's programs (each one's label and its
//     two sources' hashes and lengths) and each device's count and defines, compared with or written to FILE.
//     Programs are matched by their hashes; the labels (the world's own program names) are for people.
//   node glsl_guard.js SITE_DIR [--manifest FILE] [--write FILE] [--selftest] [--json FILE] [--visits N] [--dump DIR]
//   node glsl_guard.js SITE_DIR --reduced          the reference device's first visit under prefers-reduced-motion: the
//                                                    world one still frame (RULES.json reduced-motion-still): after its
//                                                    0.1 s redraw nothing more is drawn or asked for, a drag included
//   node glsl_guard.js SITE_DIR --first --dump DIR   only the reference device's first visit (its seed, hour and window as in a
//                                                    full run), dumped, nothing judged: test/shaders.mjs reads just that visit
//   --manifest FILE  compare with that manifest (CI); --write FILE  write it (after a deliberate change, then commit it);
//   --selftest  the guard's own proof: the same visits with a planted per-visit literal, a per-window literal and one
//   program changed without its manifest line, each of which must be caught (CI runs it)
// Exit 0: every rule holds. 1: a rule failed (each failure an ::error:: line). 2: usage, or node older than 22.8.
// 3: the fake browser could not bring the world to its show (the page needs something the fake does not give: extend
// the fake, never relax the rules). Plain node, no dependency; deterministic (every visit's inputs are fixed here).
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), crypto = require('crypto');
const A = { _: [] };
for (let i = 2; i < process.argv.length; i++) { const a = process.argv[i]; if (a === '--selftest') A.selftest = true; else if (a === '--first') A.first = true; else if (a === '--reduced') A.first = A.reduced = true; else if (a.startsWith('--')) A[a.slice(2)] = process.argv[++i]; else A._.push(a); }
const SITE = A._[0];
if (!SITE || !fs.existsSync(path.join(SITE, 'index.html'))) { console.error('usage: node glsl_guard.js SITE_DIR [--manifest FILE] [--write FILE] [--json FILE] [--visits N] [--dump DIR]'); process.exit(2); }
if (!vm.constants || vm.constants.DONT_CONTEXTIFY === undefined) { console.error('glsl_guard.js needs node 22.8 or later (vm.constants.DONT_CONTEXTIFY)'); process.exit(2); }
const sha = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex').slice(0, 24);

// ------------------------------------------------------------------ the devices and their visits
const UA = {
  win: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  android: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1'
};
const EXT = ['EXT_color_buffer_float', 'EXT_color_buffer_half_float', 'KHR_parallel_shader_compile', 'WEBGL_debug_renderer_info', 'EXT_texture_filter_anisotropic', 'OES_texture_float_linear', 'EXT_float_blend', 'WEBGL_lose_context'];
const DEVICES = [   // the first is the reference: the manifest's programs are its own
  { id: 'desktop', ua: UA.win, touch: 0, ext: EXT, samples: 4, renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 4090 Direct3D11 vs_5_0 ps_5_0, D3D11)',
    wins: [[1440, 900, 1], [1024, 768, 1], [2560, 1440, 1], [1280, 800, 2], [1920, 1080, 1.25]] },
  { id: 'phone', ua: UA.android, touch: 5, ext: EXT, samples: 4, renderer: 'ANGLE (Qualcomm, Adreno (TM) 740, OpenGL ES 3.2)', wins: [[393, 852, 3], [360, 780, 3], [412, 915, 2.625]] },
  { id: 'webkit', ua: UA.iphone, touch: 5, ext: EXT.filter((e) => e !== 'WEBGL_debug_renderer_info'), samples: 4, renderer: 'Apple GPU', wins: [[393, 852, 3], [430, 932, 3]] },
  { id: 'half', ua: UA.win, touch: 0, ext: EXT.filter((e) => e !== 'EXT_color_buffer_float'), samples: 4, renderer: 'ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)', wins: [[1366, 768, 1], [1440, 900, 1]] },
  { id: 'byte', ua: UA.android, touch: 5, ext: EXT.filter((e) => !/color_buffer|parallel/.test(e)), samples: 0, renderer: 'ANGLE (ARM, Mali-G52, OpenGL ES 3.2)', wins: [[360, 800, 2], [393, 852, 3]] }
];
const HOURS = [11.5, 23.5, 6.25, 17.5, 14.5, 20.25, 2.75];   // day, night, dawn, sunset, rain, dusk, night again
function visits() {
  const out = []; let k = 0;
  for (const d of (A.first ? [DEVICES[0]] : DEVICES)) {
    const n = A.first ? 1 : d === DEVICES[0] ? Math.max(3, +(A.visits || 5)) : Math.max(2, Math.min(+(A.visits || 5), d.wins.length));
    for (let i = 0; i < n; i++, k++) {
      const w = d.wins[i % d.wins.length];
      out.push({ dev: d, n: i, seed: (Math.imul(0x9e3779b9, k + 1) + Math.imul(0x7f4a7c15, i + 3)) >>> 0, hour: HOURS[k % HOURS.length], w: w[0], h: w[1], dpr: w[2],
        hz: [60, 144, 120, 90, 75][k % 5], t0: 200 + 977 * k });
    }
  }
  if (!A.first) out.push(Object.assign({}, out[0], { n: 'again' }));   // (the first visit once more: the fake itself must be deterministic)
  return out;
}

// ------------------------------------------------------------------ the page's scripts, in the order it runs them
function scriptsOf(site) {   // classic scripts in document order (an async one as if it arrived at once), then the deferred
  const html = fs.readFileSync(path.join(site, 'index.html'), 'utf8').replace(/<!--[\s\S]*?-->/g, '');
  const now = [], later = [];
  for (const m of html.matchAll(/<script\b([^>]*)>/g)) {
    const a = m[1], src = /\bsrc="\/([^"?#]+)"/.exec(a);
    if (src) (/\bdefer\b|type="module"/.test(a) ? later : now).push(src[1]);
  }
  return now.concat(later);
}
/* the labels: the world registers each program with compile(vs, fs, name). Where a script shows that function as
   written, the copy evaluated here reports each registration's name and texts to the guard (a call, nothing changed:
   the sources the guard checks are the ones the page hands shaderSource). Where it does not (a minified file), there
   are no labels from the page, and --write keeps the old manifest's labels for programs it still finds. */
const REG = /function compile\(([\w$]+), ?([\w$]+), ?([\w$]+)\) ?\{/g;
function loadScripts(site, scripts) {
  let hooks = 0;
  const code = scripts.map((s) => {
    const f = path.join(site, s);
    if (!fs.existsSync(f)) return { s, missing: true };
    const c = fs.readFileSync(f, 'utf8').replace(REG, (m, vs, fsn, name) => { hooks++; return m + ` if (globalThis.__glslReg) globalThis.__glslReg(${name}, ${vs}, ${fsn});`; });
    return { s, c };
  });
  return { code, labels: hooks === 1 };
}

// ------------------------------------------------------------------ one visit in a small fake browser
function run(V, page) {
  return new Promise((resolve) => {
    const R = { shaders: [], programs: [], reg: [], errors: [], shown: false, frames: 0, shownF: -1, lastRafF: -1, lastDrawF: -1 };
    let clock = V.t0;
    const now = () => (clock += 0.02);   // (each read moves the clock on a little, so a loop that works to a deadline ends)
    function guard(f, where) { try { f(); } catch (e) { R.errors.push(where + ': ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).map((x) => x.trim()).join(' | ') : String(e))); } }
    // --- events
    const listeners = new Map();
    const lk = (t, type) => (t.__id || 'win') + ':' + type;
    function on(t, type, f) { if (!listeners.has(lk(t, type))) listeners.set(lk(t, type), []); listeners.get(lk(t, type)).push(f); }
    function off(t, type, f) { const a = listeners.get(lk(t, type)); if (a && a.indexOf(f) >= 0) a.splice(a.indexOf(f), 1); }
    function fire(t, type, ev) { for (const f of (listeners.get(lk(t, type)) || []).slice()) guard(() => f.call(t, Object.assign({ type, target: t, preventDefault() {}, stopPropagation() {} }, ev || {})), type); }
    // --- the elements the page reads
    let ids = 0;
    function el(tag, attrs, box) {
      const at = Object.assign({}, attrs || {}), cls = new Set(String(at.class || '').split(/\s+/).filter(Boolean)), props = {};
      const e = {
        __id: 'e' + (++ids), tagName: tag.toUpperCase(), nodeName: tag.toUpperCase(), nodeType: 1, children: [], childNodes: [], parentNode: null, textContent: '', innerText: '',
        getAttribute(n) { return n === 'class' ? [...cls].join(' ') : (n in at ? at[n] : null); },
        setAttribute(n, v) { if (n === 'class') { cls.clear(); String(v).split(/\s+/).filter(Boolean).forEach((c) => cls.add(c)); } else at[n] = String(v); },
        removeAttribute(n) { delete at[n]; }, hasAttribute(n) { return n in at; },
        classList: { add(...c) { c.forEach((x) => cls.add(x)); }, remove(...c) { c.forEach((x) => cls.delete(x)); }, contains(c) { return cls.has(c); },
          toggle(c, f) { const o = f === undefined ? !cls.has(c) : !!f; if (o) cls.add(c); else cls.delete(c); return o; } },
        style: { setProperty(n, v) { props[n] = v; }, removeProperty(n) { delete props[n]; }, getPropertyValue(n) { return props[n] || ''; } },
        get className() { return [...cls].join(' '); }, set className(v) { this.setAttribute('class', v); },
        addEventListener(t, f) { on(e, t, f); }, removeEventListener(t, f) { off(e, t, f); }, dispatchEvent() { return true; },
        getBoundingClientRect() { const b = box ? box() : [0, 0, V.w, V.h]; return { x: b[0], y: b[1], left: b[0], top: b[1], width: b[2], height: b[3], right: b[0] + b[2], bottom: b[1] + b[3] }; },
        getClientRects() { return [this.getBoundingClientRect()]; },
        get clientWidth() { return this.getBoundingClientRect().width; }, get clientHeight() { return this.getBoundingClientRect().height; },
        get offsetWidth() { return this.getBoundingClientRect().width; }, get offsetHeight() { return this.getBoundingClientRect().height; },
        querySelector() { return null; }, querySelectorAll() { return []; }, closest() { return null; }, contains() { return false; },
        setPointerCapture() {}, releasePointerCapture() {}, hasPointerCapture() { return false; }, focus() {}, blur() {},
        getContext(type) { return tag === 'canvas' && type === 'webgl2' ? gl : null; }
      };
      return e;
    }
    const canvas = el('canvas', { class: 'sky', 'aria-hidden': 'true' });
    canvas.width = 300; canvas.height = 150;
    // --- the WebGL2 context: it keeps every source, says yes to every compile and link, and draws nothing
    const K = new Map(); let kn = 0x10000;
    const FIX = { NO_ERROR: 0, NONE: 0, ZERO: 0, ONE: 1, FALSE: 0, TRUE: 1, POINTS: 0, LINES: 1, TRIANGLES: 4, TRIANGLE_STRIP: 5, TEXTURE0: 0x84C0, COLOR_ATTACHMENT0: 0x8CE0, DRAW_BUFFER0: 0x8825 };
    const C = (n) => { if (n in FIX) return FIX[n]; if (!K.has(n)) { K.set(n, kn); kn += 64; } return K.get(n); };
    const NAME = (v) => { for (const [n, x] of K) if (x === v) return n; for (const n in FIX) if (FIX[n] === v) return n; return String(v); };
    const PARAM = { VERSION: 'WebGL 2.0 (OpenGL ES 3.0)', SHADING_LANGUAGE_VERSION: 'WebGL GLSL ES 3.00', VENDOR: 'WebKit', RENDERER: 'WebKit WebGL',
      UNMASKED_RENDERER_WEBGL: V.dev.renderer, UNMASKED_VENDOR_WEBGL: 'Google Inc.', MAX_TEXTURE_SIZE: 16384, MAX_3D_TEXTURE_SIZE: 2048, MAX_ARRAY_TEXTURE_LAYERS: 2048,
      MAX_DRAW_BUFFERS: 8, MAX_COLOR_ATTACHMENTS: 8, MAX_SAMPLES: V.dev.samples, MAX_RENDERBUFFER_SIZE: 16384, MAX_TEXTURE_IMAGE_UNITS: 16,
      MAX_COMBINED_TEXTURE_IMAGE_UNITS: 32, MAX_VERTEX_TEXTURE_IMAGE_UNITS: 16, MAX_VERTEX_ATTRIBS: 16, MAX_VARYING_VECTORS: 30, MAX_VARYING_COMPONENTS: 120,
      MAX_FRAGMENT_UNIFORM_VECTORS: 1024, MAX_VERTEX_UNIFORM_VECTORS: 4096, MAX_UNIFORM_BLOCK_SIZE: 65536, MAX_UNIFORM_BUFFER_BINDINGS: 24,
      MAX_TEXTURE_LOD_BIAS: 15, MAX_CUBE_MAP_TEXTURE_SIZE: 16384, MAX_ELEMENT_INDEX: 4294967295, MAX_SERVER_WAIT_TIMEOUT: 0, MAX_CLIENT_WAIT_TIMEOUT_WEBGL: 0,
      MAX_TEXTURE_MAX_ANISOTROPY_EXT: 16 };
    const obj = (kind) => ({ __kind: kind });
    // a read-back gives a mid-toned, uneven picture in bytes (a first frame that looks like a sky) and zeros in floats
    function fillRead(d) { if (/^\[object Uint8(Clamped)?Array\]$/.test(Object.prototype.toString.call(d))) for (let i = 0; i < d.length; i++) d[i] = 40 + (i * 7919 + (i >> 2) * 13) % 160; }
    const T = {
      canvas,
      get drawingBufferWidth() { return canvas.width; }, get drawingBufferHeight() { return canvas.height; },
      getExtension(n) { if (!V.dev.ext.includes(n)) return null; return new Proxy({ __ext: n }, { get(t, p) { if (p in t) return t[p]; if (typeof p === 'string' && /^[A-Z0-9_]+$/.test(p)) return C(p); return () => undefined; } }); },
      getSupportedExtensions() { return V.dev.ext.slice(); },
      getContextAttributes() { return { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: true, preserveDrawingBuffer: false, powerPreference: 'default' }; },
      isContextLost() { return false; }, getError() { return 0; },
      getParameter(p) { const n = NAME(p); if (n in PARAM) return PARAM[n]; if (n === 'MAX_VIEWPORT_DIMS') return Int32Array.of(32767, 32767); if (/RANGE$/.test(n)) return Float32Array.of(1, 1024); return 0; },
      getShaderPrecisionFormat() { return { rangeMin: 127, rangeMax: 127, precision: 23 }; },
      getInternalformatParameter() { return V.dev.samples ? Int32Array.of(V.dev.samples, 2) : new Int32Array(0); },
      createShader(type) { return { __kind: 'shader', type: NAME(type), src: null }; },
      shaderSource(s, src) { s.src = String(src); R.shaders.push(s.type + '\n' + s.src); },
      getShaderSource(s) { return s.src; }, getShaderParameter() { return true; }, getShaderInfoLog() { return ''; },
      createProgram() { return { __kind: 'program', sh: [] }; },
      attachShader(p, s) { p.sh.push(s); },
      linkProgram(p) { const v = p.sh.find((s) => s.type === 'VERTEX_SHADER'), f = p.sh.find((s) => s.type === 'FRAGMENT_SHADER'); R.programs.push({ vs: v ? v.src : '', fs: f ? f.src : '' }); },
      getProgramParameter(p, x) { const n = NAME(x); if (/STATUS/.test(n)) return true; if (n === 'ATTACHED_SHADERS') return p.sh.length; return 0; },
      getProgramInfoLog() { return ''; }, getUniformLocation() { return {}; }, getAttribLocation() { return 0; }, getUniformBlockIndex() { return 0; },
      getActiveUniform() { return null; }, getActiveAttrib() { return null; }, getFragDataLocation() { return 0; },
      checkFramebufferStatus() { return C('FRAMEBUFFER_COMPLETE'); },
      fenceSync() { return obj('sync'); }, clientWaitSync() { return C('ALREADY_SIGNALED'); }, getSyncParameter(s, x) { return NAME(x) === 'SYNC_STATUS' ? C('SIGNALED') : 0; },
      getQueryParameter(q, x) { return NAME(x) === 'QUERY_RESULT_AVAILABLE' ? true : 0; },
      readPixels(x, y, w, h, f, t, dst) { fillRead(dst); }, getBufferSubData(tg, off, dst) { fillRead(dst); },
      isProgram() { return true; }, isShader() { return true; }, isTexture() { return true; }, isBuffer() { return true; }, isFramebuffer() { return true; }
    };
    const gl = new Proxy(T, { get(t, p) {
      if (p in t) return t[p];
      if (typeof p !== 'string') return undefined;
      if (/^[A-Z0-9_]+$/.test(p)) return C(p);
      if (/^create[A-Z]/.test(p)) return () => obj(p.slice(6));
      if (/^(draw|blitFramebuffer$|clear$)/.test(p)) return () => { R.lastDrawF = R.frames; };   // (--reduced: when the page last drew)
      return () => undefined;
    } });
    // --- the document: today's index.html in outline
    const root = el('html', { lang: 'en' }), meta = el('meta', { name: 'theme-color', content: '#173a63' }), body = el('body');
    const main = el('main', {}, () => [16, 0, V.w - 32, V.h]);
    const stack = el('div', { class: 'stack' }, () => [Math.round(V.w * 0.1), Math.round(V.h * 0.32), Math.round(V.w * 0.6), 160]);
    const name = el('h1', { class: 'name' }, () => [Math.round(V.w * 0.1), Math.round(V.h * 0.32), Math.min(404, V.w - 32), 97]);
    const footer = el('footer', {}, () => [16, V.h - 64, V.w - 32, 48]);
    const links = [el('a', { href: '#', id: 'email-link' }, () => [16, V.h - 48, 40, 22]), el('a', { href: '#second', rel: 'me' }, () => [72, V.h - 48, 62, 22])];
    const SEL = { 'canvas.sky': canvas, canvas, 'meta[name="theme-color"]': meta, main, footer, '.stack': stack, h1: name, '.name': name, 'h1.name': name, body, html: root };
    const document = {
      __id: 'doc', documentElement: root, body, head: el('head'), readyState: 'loading', hidden: false, visibilityState: 'visible', referrer: '',
      fonts: { ready: Promise.resolve(), status: 'loaded', addEventListener() {}, check() { return true; } },
      querySelector(s) { s = s.trim(); return SEL[s] || null; },
      querySelectorAll(s) { s = s.trim(); if (s === 'footer a' || s === 'a') return links.slice(); return SEL[s] ? [SEL[s]] : []; },
      getElementById(i) { return i === 'email-link' ? links[0] : null; }, getElementsByTagName(t) { return t === 'canvas' ? [canvas] : []; },
      addEventListener(t, f) { on(document, t, f); }, removeEventListener(t, f) { off(document, t, f); }, hasFocus() { return true; }, createElement(t) { return el(t); }
    };
    // --- the window: requestAnimationFrame and timers on the visit's own clock
    let raf = [], rafN = 0, timers = [], timerN = 0;
    const mq = (q) => {
      let m = false;
      if (/min-aspect-ratio:\s*6\s*\/\s*5/.test(q)) m = V.w * 5 >= V.h * 6;
      else if (/pointer:\s*coarse|hover:\s*none/.test(q)) m = V.dev.touch > 0;
      else if (/pointer:\s*fine|hover:\s*hover/.test(q)) m = V.dev.touch === 0;
      else if (/prefers-reduced-motion:\s*reduce/.test(q)) m = !!A.reduced;
      else if (/orientation:\s*portrait/.test(q)) m = V.h > V.w;
      else if (/orientation:\s*landscape/.test(q)) m = V.w >= V.h;
      return { matches: m, media: q, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} };
    };
    class Obs { constructor(f) { this.f = f; } observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } }
    const win = {
      __id: 'win', document,
      navigator: { userAgent: V.dev.ua, maxTouchPoints: V.dev.touch, hardwareConcurrency: 8, deviceMemory: 8, language: 'en-US', languages: ['en-US'],
        platform: /iPhone/.test(V.dev.ua) ? 'iPhone' : /Android/.test(V.dev.ua) ? 'Linux armv8l' : 'Win32', vendor: /iPhone/.test(V.dev.ua) ? 'Apple Computer, Inc.' : 'Google Inc.', onLine: true },
      innerWidth: V.w, innerHeight: V.h, outerWidth: V.w, outerHeight: V.h, devicePixelRatio: V.dpr, scrollX: 0, scrollY: 0, pageXOffset: 0, pageYOffset: 0,
      screen: { width: V.w, height: V.h, availWidth: V.w, availHeight: V.h, colorDepth: 24, orientation: { type: V.h > V.w ? 'portrait-primary' : 'landscape-primary', angle: 0, addEventListener() {} } },
      visualViewport: { width: V.w, height: V.h, scale: 1, offsetLeft: 0, offsetTop: 0, addEventListener() {}, removeEventListener() {} },
      matchMedia: mq,
      getComputedStyle() { return { getPropertyValue() { return ''; }, color: 'rgb(0, 0, 0)', backgroundColor: 'rgb(255, 255, 255)', opacity: '1', display: 'block', visibility: 'visible' }; },
      requestAnimationFrame(f) { raf.push([++rafN, f]); return rafN; }, cancelAnimationFrame(i) { raf = raf.filter((x) => x[0] !== i); },
      setTimeout(f, ms) { timers.push([++timerN, clock + (+ms || 0), f, 0]); return timerN; }, clearTimeout(i) { timers = timers.filter((x) => x[0] !== i); },
      setInterval(f, ms) { const p = Math.max(4, +ms || 0); timers.push([++timerN, clock + p, f, p]); return timerN; }, clearInterval(i) { timers = timers.filter((x) => x[0] !== i); },
      performance: { now, mark() {}, measure() {}, getEntriesByName() { return []; }, getEntriesByType() { return []; }, timeOrigin: 1.7e12 + V.t0 },
      crypto: { getRandomValues(a) { let s = V.seed; for (let i = 0; i < a.length; i++) { s = (s + 0x9e3779b9) >>> 0; let t = s ^ (s >>> 16); t = Math.imul(t, 0x21f0aaad); t ^= t >>> 15; t = Math.imul(t, 0x735a2d97); a[i] = (t ^ (t >>> 15)) >>> 0; } return a; } },
      addEventListener(t, f) { on(win, t, f); }, removeEventListener(t, f) { off(win, t, f); }, dispatchEvent() { return true; },
      ResizeObserver: Obs, IntersectionObserver: Obs, MutationObserver: Obs, PerformanceObserver: class extends Obs { static get supportedEntryTypes() { return []; } },
      WebGL2RenderingContext: function WebGL2RenderingContext() {}, HTMLCanvasElement: function HTMLCanvasElement() {},
      location: { href: 'https://site.invalid/', origin: 'https://site.invalid', protocol: 'https:', host: 'site.invalid', hostname: 'site.invalid', pathname: '/', search: '', hash: '' },
      console: { log() {}, info() {}, warn() {}, error() {}, debug() {} },
      queueMicrotask(f) { Promise.resolve().then(f); },
      __glslReg(n, vs, fsrc) { R.reg.push({ name: String(n), vs: String(vs), fs: String(fsrc) }); }
    };
    // (an ordinary global object, node 22.8+: a contextified sandbox sends every global lookup the page makes, Math in
    // the hashes' hot loops among them, through an interceptor, some 30 times slower)
    const ctx = vm.createContext(vm.constants.DONT_CONTEXTIFY);
    for (const k of Object.keys(win)) ctx[k] = win[k];
    vm.runInContext('var window = globalThis, self = globalThis, top = globalThis, parent = globalThis, frames = globalThis;', ctx);
    // the visitor's clock, for the hour's one read: this visit's hour, in the machine's own zone
    const hourMs = new Date(2026, 10, 4, Math.floor(V.hour), Math.round((V.hour % 1) * 60)).getTime();
    vm.runInContext('(function (T) { var D = Date; function F() { if (!(this instanceof F)) return new D(T).toString(); return arguments.length ? new (Function.prototype.bind.apply(D, [null].concat([].slice.call(arguments))))() : new D(T); }' +
      ' F.prototype = D.prototype; F.now = function () { return T; }; F.UTC = D.UTC; F.parse = D.parse; Date = F; })(' + hourMs + ');', ctx);
    for (const { s, c, missing } of page.code) {
      if (missing) { R.errors.push('index.html loads /' + s + ', which the site does not have'); continue; }
      guard(() => vm.runInContext(c, ctx, { filename: s }), s);
    }
    document.readyState = 'interactive'; fire(document, 'DOMContentLoaded');
    document.readyState = 'complete'; fire(win, 'load');
    // --- the frames: until the world has shown and 120 frames have passed with nothing new compiled, or the cap
    const dt = 1000 / V.hz, CAP = 6000;
    let quiet = 0, lastN = -1;
    (function step() {
      for (let k = 0; k < 1; k++) {   // (one frame a turn: the page's promises settle after every frame, as in a browser)
        R.frames++;
        clock = Math.max(clock, V.t0 + R.frames * dt);
        for (const t of timers.filter((x) => x[1] <= clock).sort((a, b) => a[1] - b[1])) { if (t[3]) t[1] += t[3]; else timers = timers.filter((x) => x !== t); guard(t[2], 'timer'); }
        const q = raf, ts = clock; raf = [];
        if (q.length) R.lastRafF = R.frames;
        for (const [, f] of q) guard(() => f(ts), 'frame ' + R.frames);
        if (canvas.classList.contains('on') && !R.shown) { R.shown = true; R.shownF = R.frames; }
        if (A.reduced && R.shown && R.frames === R.shownF + 60) {   // (--reduced: a press, a drag across and a release on the page: under reduced motion, inert)
          const P = { pointerId: 7, pointerType: 'mouse', button: 0, buttons: 1, clientX: V.w / 2, clientY: V.h / 2, timeStamp: clock };
          fire(win, 'pointerdown', P); fire(win, 'pointermove', Object.assign({}, P, { clientX: V.w / 2 + 200 })); fire(win, 'pointerup', Object.assign({}, P, { clientX: V.w / 2 + 200, buttons: 0 })); fire(win, 'click', P);
        }
        if (R.shaders.length !== lastN) { lastN = R.shaders.length; quiet = 0; } else quiet++;
        if ((R.shown && quiet > 120 && (!A.reduced || R.frames >= R.shownF + 120)) || R.frames >= CAP || R.errors.length > 20) return resolve(R);   // (--reduced: 120 frames past the show, the drag at 60 among them)
      }
      setImmediate(step);   // (the page's promises run between)
    })();
  });
}

// ------------------------------------------------------------------ the rules
const VER = '#version 300 es\n';
function split(src) {   // { defs: the #define lines just after #version (the device's DEFS), rest: the source without them }
  if (!src.startsWith(VER)) return { defs: [], rest: src };
  let i = VER.length; const defs = [];
  for (;;) { const j = src.indexOf('\n', i); if (j < 0) break; const L = src.slice(i, j); if (!/^#define [A-Za-z_]\w*[ \t]*$/.test(L)) break; defs.push(L.slice(8).trim()); i = j + 1; }
  return { defs, rest: VER + src.slice(i) };
}
function firstDiff(a, b) {   // where two sources part: the line and both texts, and whether only numbers differ
  const x = a.split('\n'), y = b.split('\n');
  let i = 0; while (i < x.length && i < y.length && x[i] === y[i]) i++;
  const num = (s) => s.replace(/\d+/g, '#');
  const onlyNums = x.length === y.length && x.every((l, k) => l === y[k] || num(l) === num(y[k]));
  return `line ${i + 1}: "${(x[i] || '').trim().slice(0, 110)}" against "${(y[i] || '').trim().slice(0, 110)}"` + (onlyNums ? ' (only its numbers differ: a per-visit or per-window literal)' : '');
}
function label(R, labels) {   // each linked program with its label: the world's own name where the registration shows it
  const used = new Set(), seen = new Map(); let un = 0;
  return R.programs.map((p) => {
    const bv = split(p.vs).rest, bf = split(p.fs).rest;
    let nm = null;
    if (labels) for (let i = 0; i < R.reg.length; i++) if (!used.has(i) && split(R.reg[i].vs).rest === bv && split(R.reg[i].fs).rest === bf) { used.add(i); nm = R.reg[i].name; break; }
    if (!nm) nm = labels ? 'unregistered.' + (++un) : null;
    if (nm) { const c = (seen.get(nm) || 0) + 1; seen.set(nm, c); if (c > 1) nm += '#' + c; }
    return { name: nm, vs: p.vs, fs: p.fs, bv, bf, defs: split(p.vs).defs.join(',') + '|' + split(p.fs).defs.join(',') };
  });
}
const tagOf = (v) => `${v.dev.id}#${v.n} ${v.w}x${v.h}@${v.dpr} ${v.hz}Hz hour ${v.hour}`;


/* the rules over a set of visits: { errs, dev (each device's line), text (the manifest this site gives) } */
function judge(runs, labels, oldLabels) {
  const errs = [], ids = [...new Set(runs.map((x) => x.v.dev.id))];
  // rule 1a: within a device, every visit compiles the same programs, byte for byte
  for (const id of ids) {
    const rs = runs.filter((x) => x.v.dev.id === id), a = rs[0];
    for (const b of rs.slice(1)) {
      const sa = a.r.shaders.slice().sort(), sb = b.r.shaders.slice().sort();
      if (sa.length === sb.length && sa.every((s, i) => s === sb[i]) && a.P.length === b.P.length) continue;
      let told = 0;
      for (let i = 0; i < Math.max(a.P.length, b.P.length) && told < 6; i++) {
        const p = a.P[i], q = labels && p ? b.P.find((x) => x.name === p.name) : b.P[i];
        const who = (p && p.name) || (q && q.name) || 'program ' + (i + 1);
        if (!p || !q) { errs.push(`${id}: ${who} is compiled in ${p ? tagOf(a.v) : tagOf(b.v)} but not in ${p ? tagOf(b.v) : tagOf(a.v)}`); told++; continue; }
        if (p.vs !== q.vs) { errs.push(`${id}: ${who}'s vertex source differs between visits (${tagOf(a.v)} | ${tagOf(b.v)}): ${firstDiff(p.vs, q.vs)}`); told++; }
        if (p.fs !== q.fs) { errs.push(`${id}: ${who}'s fragment source differs between visits (${tagOf(a.v)} | ${tagOf(b.v)}): ${firstDiff(p.fs, q.fs)}`); told++; }
      }
      if (!told) errs.push(`${id}: the visits ${tagOf(a.v)} and ${tagOf(b.v)} hand shaderSource different sources (${sa.length} against ${sb.length})`);
    }
  }
  // rule 1b: across devices only the #define lines after #version differ (every device's programs are the reference's)
  const ref = runs[0], refBodies = new Set(ref.P.map((p) => p.bv + '\u0000' + p.bf)), dev = {};
  for (const id of ids) {
    const x = runs.find((y) => y.v.dev.id === id), defs = new Map();
    for (const p of x.P) {
      defs.set(p.defs, (defs.get(p.defs) || 0) + 1);
      if (!refBodies.has(p.bv + '\u0000' + p.bf)) {
        const near = p.name && ref.P.find((q) => q.name === p.name);
        errs.push(`${id}: ${p.name || 'a program'} is not the reference's (${ref.v.dev.id}) but for its #define lines` + (near ? ': ' + (near.bv !== p.bv ? 'vertex ' + firstDiff(near.bv, p.bv) : 'fragment ' + firstDiff(near.bf, p.bf)) : ''));
      }
    }
    dev[id] = `device ${id} ${x.P.length} ` + [...defs].sort().map(([d, n]) => `${d === '|' ? '-' : d}:${n}`).join(' ');
  }
  // the manifest this site gives: the reference's programs, then each device's count and defines
  const progs = ref.P.map((p) => `program ${p.name || oldLabels.get(sha(p.vs) + ' ' + sha(p.fs)) || 'program.' + sha(p.vs + p.fs).slice(0, 8)} vs ${sha(p.vs)} ${p.vs.length} fs ${sha(p.fs)} ${p.fs.length}`).sort();
  const text = HEADER.concat(progs, ids.map((id) => dev[id])).join('\n') + '\n';
  return { errs, dev, ids, text, nprog: progs.length };
}
const HEADER = ['# glsl_manifest.txt: every program the world compiles on the reference device (a desktop Chrome with float targets), as',
  '# .github/workflows/glsl_guard.js finds it: "program <label> vs <sha256/24> <bytes> fs <sha256/24> <bytes>"; then each device the',
  '# guard runs: "device <id> <programs> <vertex|fragment #defines>:<count> ...". CI fails when this is not what the site compiles.',
  '# A change to any program\'s text comes with its lines here, in the same commit. After a deliberate change, regenerate it:',
  '#   node .github/workflows/glsl_guard.js site --write .github/workflows/glsl_manifest.txt'];
/* the manifest against the one committed: [] when they agree, else the problems (programs matched by their hashes) */
function compare(old, text) {
  const lines = (s) => s.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
  const want = lines(old), got = lines(text), key = (l) => l.startsWith('program ') ? l.replace(/^program \S+ /, 'program ') : l;
  const wk = new Set(want.map(key)), gk = new Set(got.map(key)), out = [];
  for (const l of got) if (!wk.has(key(l))) out.push('the site compiles a program (or a device compiles a set) the manifest does not list: ' + l);
  for (const l of want) if (!gk.has(key(l))) out.push('the manifest lists a program (or a device\'s set) the site no longer compiles: ' + l);
  if (!out.length && want.length !== got.length) out.push(`the manifest has ${want.length} lines, the site gives ${got.length} (a line listed twice?)`);
  return out;
}
/* the guard's own proof (--selftest, as CI runs it): the same visits with a fault planted in what the fake recorded;
   each must fail. A per-visit literal (a constant from the visit's entropy in one fragment source), a per-window one
   (the window's width), and one program's text changed on every visit alike (the manifest must catch it). Each is
   judged on what it adds to the run as it is (a site that already fails still proves the guard catches the plant) */
function selftest(runs, labels, oldLabels, text) {
  const target = runs[0].P[0].bf;   // (the reference's first program, planted in each device's own copy of it)
  const plant = (f) => runs.map(({ v, r, P }) => {
    const P2 = P.map((p) => p.bf === target ? Object.assign({}, p, { fs: f(p.fs, v), bf: f(p.bf, v) }) : p), was = new Map();
    P.forEach((p, k) => { if (P2[k] !== p) was.set('FRAGMENT_SHADER\n' + p.fs, 'FRAGMENT_SHADER\n' + P2[k].fs); });
    return { v, P: P2, r: Object.assign({}, r, { shaders: r.shaders.map((x) => was.has(x) ? was.get(x) : x) }) };
  });
  const after = (s, x) => s.replace(VER, VER + x);
  const res = [];
  const hit = (J, nm) => J.errs.find((e) => /only its numbers differ/.test(e) && e.includes(nm));
  const a = judge(plant((s, v) => after(s, `const float GG_SELFTEST_SEED = ${v.seed % 9973}.0;\n`)), labels, oldLabels);
  res.push(['a per-visit literal', !!hit(a, 'GG_SELFTEST_SEED'), hit(a, 'GG_SELFTEST_SEED') || a.errs[0]]);
  const b = judge(plant((s, v) => after(s, `const float GG_SELFTEST_WIN = ${v.w}.0;\n`)), labels, oldLabels);
  res.push(['a per-window literal', !!hit(b, 'GG_SELFTEST_WIN'), hit(b, 'GG_SELFTEST_WIN') || b.errs[0]]);
  const c = judge(plant((s) => s + '\n// (selftest: one program\'s text changed)\n'), labels, oldLabels);
  const cm = compare(text, c.text);   // (against the manifest of the run as it is: one line gone, one new)
  res.push(['one program changed, its manifest line not', cm.length === 2 && c.errs.length === judge(runs, labels, oldLabels).errs.length, cm[0] || c.errs[0]]);
  return res;
}

(async () => {
  const scripts = scriptsOf(SITE), page = loadScripts(SITE, scripts), VS = visits(), t0 = Date.now();
  console.log(`glsl_guard: ${SITE}: the page runs ${scripts.join(', ')}; labels ${page.labels ? "from the world's compile()" : 'not shown by the source (minified?): programs matched by hash only'}`);
  const runs = [];
  for (const v of VS) {
    const r = await run(v, page), P = label(r, page.labels);
    runs.push({ v, r, P });
    console.log(`  visit ${tagOf(v)}: ${r.frames} frames, ${r.shown ? 'shown' : 'NOT SHOWN'}, ${r.programs.length} programs, ${r.shaders.length} sources${r.errors.length ? ', ' + r.errors.length + ' page errors' : ''}`);
    for (const e of r.errors.slice(0, 3)) console.log('    page error: ' + e);
  }
  const t = () => ((Date.now() - t0) / 1000).toFixed(1) + ' s';
  // the fake must bring the world to its show (else what the page compiles later was never seen)
  const unshown = runs.filter((x) => !x.r.shown || !x.r.programs.length);
  if (unshown.length) {
    for (const x of unshown) console.log(`::error::the fake browser did not bring the world to its show (${tagOf(x.v)}: ${x.r.programs.length} programs; page errors: ${x.r.errors.slice(0, 2).join(' / ') || 'none'})`);
    console.log('glsl_guard: cannot judge (exit 3): extend the fake browser for what the page now needs; never relax the rules');
    process.exit(3);
  }
  const mf = A.manifest || A.write, old = mf && fs.existsSync(mf) ? fs.readFileSync(mf, 'utf8') : null;
  const oldLabels = new Map();
  if (old) for (const L of old.split('\n')) { const m = /^program (\S+) vs (\w+) \d+ fs (\w+) \d+$/.exec(L.trim()); if (m) oldLabels.set(m[2] + ' ' + m[3], m[1]); }
  if (A.reduced) {   // (RULES.json reduced-motion-still: one still frame; after its 0.1 s of redraws (sky.v2's rule for WebKit) the loop stops, and a drag starts nothing)
    const r = runs[0].r, lim = r.shownF + Math.ceil(0.1 * runs[0].v.hz) + 2, bad = [];
    if (!r.shown) bad.push('the still frame never showed');
    if (r.lastRafF > lim) bad.push(`a frame was still asked for at frame ${r.lastRafF} (shown at ${r.shownF}; the loop must stop by ${lim}, and stay stopped after the drag at ${r.shownF + 60})`);
    if (r.lastDrawF > lim) bad.push(`the page drew at frame ${r.lastDrawF} (shown at ${r.shownF}; nothing after ${lim})`);
    if (r.errors.length) bad.push('page errors: ' + r.errors.slice(0, 2).join(' / '));
    for (const b of bad) console.log('::error::reduced motion: ' + b);
    if (!bad.length) console.log(`reduced motion: one still frame (shown at frame ${r.shownF}, the last frame asked ${r.lastRafF}, the last draw ${r.lastDrawF}; ${r.frames} frames run, a drag at ${r.shownF + 60} inert)`);
    process.exit(bad.length ? 1 : 0);
  }
  if (A.first) {   // (dev-speed: shaders.mjs's one visit, dumped; nothing judged)
  if (A.dump) { fs.mkdirSync(A.dump, { recursive: true }); for (const { v, P } of runs) P.forEach((p, j) => { const b = path.join(A.dump, `${v.dev.id}${v.n}_${String(j).padStart(2, '0')}_${(p.name || 'p').replace(/[^\w.-]/g, '_')}`); fs.writeFileSync(b + '.vert', p.vs); fs.writeFileSync(b + '.frag', p.fs); }); }
    process.exit(runs.length === 1 && runs[0].P.length ? 0 : 1);
  }
  const J = judge(runs, page.labels, oldLabels);
  const fails = J.errs.slice();
  if (A.manifest) { if (old === null) fails.push(`no manifest at ${A.manifest}: write it with --write and commit it`); else fails.push(...compare(old, J.text)); }
  let proof = null;
  if (A.selftest) proof = selftest(runs, page.labels, oldLabels, J.text);
  if (A.json) fs.writeFileSync(A.json, JSON.stringify({ site: SITE, scripts, labels: page.labels, errors: fails, selftest: proof, manifest: J.text,
    visits: runs.map(({ v, r, P }) => ({ visit: tagOf(v), seed: v.seed, frames: r.frames, shown: r.shown, pageErrors: r.errors, programs: P.map((p) => ({ name: p.name, vs: sha(p.vs), vl: p.vs.length, fs: sha(p.fs), fl: p.fs.length, defs: p.defs })) })) }, null, 1));
  if (A.dump) { fs.mkdirSync(A.dump, { recursive: true }); for (const { v, P } of runs) P.forEach((p, j) => { const b = path.join(A.dump, `${v.dev.id}${v.n}_${String(j).padStart(2, '0')}_${(p.name || 'p').replace(/[^\w.-]/g, '_')}`); fs.writeFileSync(b + '.vert', p.vs); fs.writeFileSync(b + '.frag', p.fs); }); }
  let bad = fails.length;
  if (proof) for (const [what, ok, why] of proof) { console.log(`  selftest: ${what}: ${ok ? 'caught' : 'NOT CAUGHT'}${why ? ' (' + String(why).slice(0, 160) + ')' : ''}`); if (!ok) { console.log(`::error::the guard no longer catches ${what}`); bad++; } }
  for (const e of fails) console.log('::error::' + e);
  if (J.errs.length) console.log(`glsl_guard: FAIL: ${J.errs.length} GLSL source(s) not the same on every visit of a device: each misses Chrome's shader cache on every return (${t()})`);
  else console.log(`glsl_guard: every visit of each device compiles the same sources (${runs.length} visits; ${J.ids.map((id) => J.dev[id].replace('device ', '')).join('; ')})`);
  if (A.manifest && old !== null) console.log(fails.length > J.errs.length ? `glsl_guard: FAIL: the manifest is not what the site compiles: a change to a program's text comes with its manifest lines in the same commit (node .github/workflows/glsl_guard.js site --write ${A.manifest}) (${t()})`
    : `glsl_guard: the manifest is what the site compiles (${J.nprog} programs, ${J.ids.length} devices) (${t()})`);
  if (A.write) {
    if (J.errs.length) { console.log(`glsl_guard: not written: fix the sources first (${A.write})`); process.exit(1); }
    fs.writeFileSync(A.write, J.text); console.log(`glsl_guard: wrote ${A.write} (${J.nprog} programs, ${J.ids.length} devices) (${t()})`);
  }
  process.exit(bad ? 1 : 0);
})();
