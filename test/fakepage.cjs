// test/fakepage.cjs: the one fake browser the static checks share (moved out of glsl_guard.js, 2026-11-07): the devices the
// world is visited on, the page's scripts as index.html loads them, and run(V, page, O), one visit in a small fake browser
// (WebGL2 recorded, not drawn; the visit's own clock, seed and window; O.reduced: prefers-reduced-motion). Used by
// .github/workflows/glsl_guard.js (the shaders' guard and --reduced) and the sims on it. Plain node 22.8+, no dependency.
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');

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
function run(V, page, O = {}) {   // (O.reduced: prefers-reduced-motion matches)
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
    // the page paints at the end of every frame, after its animation frames; the first paint is recorded (a paint entry)
    // and told to the page's paint observers in a task, as a browser does (the world's boot waits for it: afterPaint)
    let painted = false; const paintObs = [], PAINT = { name: 'first-paint', entryType: 'paint', startTime: 0, duration: 0 };
    const mq = (q) => {
      let m = false;
      if (/min-aspect-ratio:\s*6\s*\/\s*5/.test(q)) m = V.w * 5 >= V.h * 6;
      else if (/pointer:\s*coarse|hover:\s*none/.test(q)) m = V.dev.touch > 0;
      else if (/pointer:\s*fine|hover:\s*hover/.test(q)) m = V.dev.touch === 0;
      else if (/prefers-reduced-motion:\s*reduce/.test(q)) m = !!O.reduced;
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
      performance: { now, mark() {}, measure() {}, getEntriesByName() { return []; }, getEntriesByType(t) { return t === 'paint' && painted ? [PAINT] : []; }, timeOrigin: 1.7e12 + V.t0 },
      crypto: { getRandomValues(a) { let s = V.seed; for (let i = 0; i < a.length; i++) { s = (s + 0x9e3779b9) >>> 0; let t = s ^ (s >>> 16); t = Math.imul(t, 0x21f0aaad); t ^= t >>> 15; t = Math.imul(t, 0x735a2d97); a[i] = (t ^ (t >>> 15)) >>> 0; } return a; } },
      addEventListener(t, f) { on(win, t, f); }, removeEventListener(t, f) { off(win, t, f); }, dispatchEvent() { return true; },
      ResizeObserver: Obs, IntersectionObserver: Obs, MutationObserver: Obs, PerformanceObserver: class extends Obs {
        static get supportedEntryTypes() { return ['paint']; }
        observe(o) { if (o && (o.type === 'paint' || (o.entryTypes || []).includes('paint')) && !paintObs.includes(this)) paintObs.push(this); }
        disconnect() { const i = paintObs.indexOf(this); if (i >= 0) paintObs.splice(i, 1); }
      },
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
        if (!painted) { painted = true; PAINT.startTime = clock; for (const o of paintObs.slice()) timers.push([++timerN, clock, () => o.f({ getEntries: () => [PAINT] }, o), 0]); }
        if (canvas.classList.contains('on') && !R.shown) { R.shown = true; R.shownF = R.frames; }
        if (O.reduced && R.shown && R.frames === R.shownF + 60) {   // (--reduced: a press, a drag across and a release on the page: under reduced motion, inert)
          const P = { pointerId: 7, pointerType: 'mouse', button: 0, buttons: 1, clientX: V.w / 2, clientY: V.h / 2, timeStamp: clock };
          fire(win, 'pointerdown', P); fire(win, 'pointermove', Object.assign({}, P, { clientX: V.w / 2 + 200 })); fire(win, 'pointerup', Object.assign({}, P, { clientX: V.w / 2 + 200, buttons: 0 })); fire(win, 'click', P);
        }
        if (R.shaders.length !== lastN) { lastN = R.shaders.length; quiet = 0; } else quiet++;
        if ((R.shown && quiet > 120 && (!O.reduced || R.frames >= R.shownF + 120)) || R.frames >= CAP || R.errors.length > 20) return resolve(R);   // (--reduced: 120 frames past the show, the drag at 60 among them)
      }
      setImmediate(step);   // (the page's promises run between)
    })();
  });
}

/* runMany(VS, site, scripts, O, n): the visits VS in up to n worker threads (check-speed, 2026-11-07), each thread loading
   the page itself and running the visits k, k + n, ...; every visit's inputs are its own (seed, hour, window, clock), so
   each result is the one it gives alone, returned in VS's order. n 1 (or FAKEPAGE_THREADS=1): one after another */
async function runMany(VS, site, scripts, O = {}, n = 4) {
  const os = require('os'), { Worker } = require('worker_threads');
  n = Math.max(1, Math.min(+(process.env.FAKEPAGE_THREADS || n), os.cpus().length, VS.length));
  if (n === 1) { const page = loadScripts(site, scripts), out = []; for (const v of VS) out.push(await run(v, page, O)); return out; }
  const out = new Array(VS.length);
  await Promise.all(Array.from({ length: n }, (_, k) => new Promise((res, rej) => {
    const w = new Worker(__filename, { workerData: { fakepageVisits: true, VS, site, scripts, O, k, n } });
    w.on('message', (m) => { out[m.i] = m.r; }); w.on('error', rej); w.on('exit', (c) => (c ? rej(new Error('a fake page thread exited ' + c)) : res()));
  })));
  return out;
}
const WT = require('worker_threads');
if (!WT.isMainThread && WT.workerData && WT.workerData.fakepageVisits) {
  const { VS, site, scripts, O, k, n } = WT.workerData, page = loadScripts(site, scripts);
  (async () => { for (let i = k; i < VS.length; i += n) WT.parentPort.postMessage({ i, r: await run(VS[i], page, O) }); })();
}

module.exports = { UA, EXT, DEVICES, HOURS, scriptsOf, loadScripts, run, runMany };
